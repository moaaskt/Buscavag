import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { AdminPaymentRepository, type PaymentGateway } from '@/db/adminPaymentRepository';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gateway: string }> }
) {
  try {
    const { gateway: rawGateway } = await params;
    const gateway = (['mercadopago', 'stripe', 'asaas'].includes(rawGateway)
      ? rawGateway
      : 'manual') as PaymentGateway;

    const payload = await req.json().catch(() => ({}));
    const eventType = payload.type || payload.event || payload.action || 'payment.event';

    const repo = new AdminPaymentRepository();

    // 1. Grava o payload bruto na tabela de webhooks
    const savedEvent = repo.saveWebhookEvent(gateway, eventType, payload);

    // 2. Extrai dados relevantes conforme a estrutura comum dos gateways
    let userEmail: string | undefined;
    let userId: string | undefined;
    let amount = 29.90;
    let isApproved = false;
    let gatewayPaymentId = `pay_${Date.now()}`;
    let paymentMethod = 'credit_card';

    // Mercado Pago format
    if (gateway === 'mercadopago') {
      if (payload.action === 'payment.created' || payload.type === 'payment' || payload.status === 'approved') {
        isApproved = payload.data?.status === 'approved' || payload.status === 'approved' || payload.action === 'payment.created';
        userEmail = payload.data?.payer?.email || payload.payer?.email || payload.email;
        userId = payload.data?.external_reference || payload.external_reference;
        amount = payload.data?.transaction_amount || payload.transaction_amount || 29.90;
        gatewayPaymentId = String(payload.data?.id || payload.id || gatewayPaymentId);
        paymentMethod = payload.data?.payment_method_id === 'pix' ? 'pix' : 'credit_card';
      }
    }

    // Stripe format
    else if (gateway === 'stripe') {
      if (eventType === 'checkout.session.completed' || eventType === 'invoice.paid' || eventType === 'payment_intent.succeeded') {
        isApproved = true;
        const obj = payload.data?.object || payload;
        userEmail = obj.customer_email || obj.customer_details?.email;
        userId = obj.client_reference_id || obj.metadata?.userId;
        amount = obj.amount_total ? obj.amount_total / 100 : (obj.amount ? obj.amount / 100 : 29.90);
        gatewayPaymentId = String(obj.id || gatewayPaymentId);
        paymentMethod = 'credit_card';
      }
    }

    // Asaas format
    else if (gateway === 'asaas') {
      if (eventType === 'PAYMENT_RECEIVED' || eventType === 'PAYMENT_CONFIRMED') {
        isApproved = true;
        const paymentObj = payload.payment || payload;
        userEmail = paymentObj.customerEmail || payload.customer?.email;
        userId = paymentObj.externalReference;
        amount = paymentObj.value || 29.90;
        gatewayPaymentId = String(paymentObj.id || gatewayPaymentId);
        paymentMethod = paymentObj.billingType === 'PIX' ? 'pix' : (paymentObj.billingType === 'BOLETO' ? 'boleto' : 'credit_card');
      }
    }

    // Processa ativação se o pagamento estiver aprovado
    if (isApproved && (userId || userEmail)) {
      let targetUser = userId 
        ? db.prepare('SELECT id, email FROM users WHERE id = ?').get(userId) as any
        : (userEmail ? db.prepare('SELECT id, email FROM users WHERE email = ?').get(userEmail) as any : null);

      if (targetUser) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const nowIso = now.toISOString();
        const periodEndIso = periodEnd.toISOString();
        const paymentId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const subId = `sub_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Insere a transação aprovada
        db.prepare(`
          INSERT INTO payments (
            id, user_id, gateway, gateway_payment_id, amount, currency,
            status, payment_method, plan_tier, billing_cycle, invoice_url, metadata,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'BRL', 'paid', ?, 'premium', 'monthly', NULL, ?, ?, ?)
        `).run(
          paymentId,
          targetUser.id,
          gateway,
          gatewayPaymentId,
          amount,
          paymentMethod,
          JSON.stringify(payload),
          nowIso,
          nowIso
        );

        // Insere ou atualiza a assinatura ativa
        db.prepare(`
          INSERT INTO subscriptions (
            id, user_id, gateway, gateway_subscription_id, tier, billing_cycle,
            status, amount, current_period_start, current_period_end, cancel_at_period_end,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'premium', 'monthly', 'active', ?, ?, ?, 0, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            gateway = excluded.gateway,
            status = 'active',
            tier = 'premium',
            amount = excluded.amount,
            current_period_end = excluded.current_period_end,
            updated_at = excluded.updated_at
        `).run(
          subId,
          targetUser.id,
          gateway,
          gatewayPaymentId,
          amount,
          nowIso,
          periodEndIso,
          nowIso,
          nowIso
        );
      }
    }

    return NextResponse.json({
      received: true,
      eventId: savedEvent.id,
      gateway,
      eventType,
    });
  } catch (err: any) {
    console.error('[Webhook Payments Error]:', err);
    return NextResponse.json(
      { error: 'Erro ao processar webhook de pagamento' },
      { status: 500 }
    );
  }
}
