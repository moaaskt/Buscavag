'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, LogIn, UserPlus, Sparkles } from 'lucide-react';

import {
  UserData,
  ProfileData,
  ResumeData,
  RecommendedJobItem,
  MatchStatsData,
  SavedJob,
  TabType,
} from '@/components/candidate/types';

import { CandidateHeader } from '@/components/candidate/CandidateHeader';
import { CandidateTabs } from '@/components/candidate/CandidateTabs';
import { RecommendedTab } from '@/components/candidate/RecommendedTab';
import { ProfileTab } from '@/components/candidate/ProfileTab';
import { ResumeTab } from '@/components/candidate/ResumeTab';
import { SavedJobsTab } from '@/components/candidate/SavedJobsTab';

import { UpgradeModal } from '@/components/UpgradeModal';
import { JobModal } from '@/components/JobModal';
import { ProcessedJob } from '@/types/job';

function CandidateDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as TabType | null;

  const [activeTab, setActiveTab] = useState<TabType>('recommended');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);

  // Profile State
  const [profile, setProfile] = useState<ProfileData>({
    target_role: '',
    seniority: 'Júnior',
    expected_salary: '',
    preferred_work_models: ['Remoto'],
    skills: [],
    bio: '',
    city: null,
    state: null,
  });
  const [skillInput, setSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Resume State
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [syncingSkills, setSyncingSkills] = useState(false);
  const [resumeFeedback, setResumeFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recommended Jobs State
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJobItem[]>([]);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(50);
  const [searchRec, setSearchRec] = useState<string>('');
  const [workModelRec, setWorkModelRec] = useState<string>('');
  const [matchStats, setMatchStats] = useState<MatchStatsData | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [selectedJobModal, setSelectedJobModal] = useState<ProcessedJob | null>(null);

  // Saved Jobs State
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // SaaS Paywall State
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Converte objeto de vaga em ProcessedJob para abrir o JobModal compartilhado
  const toProcessedJob = (raw: any, match?: any): ProcessedJob => ({
    id: raw.id,
    title: raw.title,
    company: raw.company,
    platform: raw.platform,
    url: raw.url,
    description: raw.description || '',
    publishedAt: new Date(raw.published_at || raw.publishedAt || Date.now()),
    location: raw.location || undefined,
    isJuniorFullStack: true,
    scoreIa: match?.overallScore ?? raw.score_ia ?? raw.overall_score ?? 0,
    overallScore: match?.overallScore ?? raw.overall_score ?? raw.score_ia ?? 0,
    stackScore: match?.stackScore,
    seniorityScore: match?.seniorityScore,
    locationScore: match?.locationScore,
    isStrongMatch: match?.isStrongMatch,
    aiReasoning: match?.matchReasoning || raw.ai_reasoning,
    directContact: raw.direct_contact || raw.directContact,
    applicationStatus: raw.status || 'pending',
    notified: false,
    createdAt: new Date(),
  });

  // Atualiza tab caso venha por query param na URL
  useEffect(() => {
    if (tabParam && ['recommended', 'profile', 'resume', 'saved'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Carregar dados iniciais da sessão
  useEffect(() => {
    fetchSession();
  }, []);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (!data.authenticated || !data.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.user);
      if (data.profile) {
        setProfile({
          target_role: data.profile.target_role || '',
          seniority: data.profile.seniority || 'Júnior',
          expected_salary: data.profile.expected_salary || '',
          preferred_work_models: data.profile.preferred_work_models || ['Remoto'],
          skills: data.profile.skills || [],
          bio: data.profile.bio || '',
          city: data.profile.city || null,
          state: data.profile.state || null,
        });
      }
      if (data.resume) {
        setResume({
          ...data.resume,
          ai_analysis: data.resume.ai_analysis || null,
          analyzedAt: data.resume.analyzed_at || null,
        });
      }

      // Se não houver tab na URL e o perfil for novo, abre perfil; senão recomendações
      if (!tabParam) {
        if (!data.profile?.skills || data.profile.skills.length === 0) {
          setActiveTab('profile');
        } else {
          setActiveTab('recommended');
        }
      }
    } catch (err) {
      console.error('Failed to load session:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedJobs = async () => {
    try {
      setLoadingRecommended(true);
      const params = new URLSearchParams();
      if (minScoreFilter > 0) params.append('minScore', minScoreFilter.toString());
      if (searchRec.trim()) params.append('search', searchRec.trim());
      if (workModelRec) params.append('workModel', workModelRec);

      const res = await fetch(`/api/candidate/recommended-jobs?${params.toString()}`);
      const data = await res.json();

      if (res.status === 403 && data.error === 'onboarding_required') {
        setOnboardingRequired(true);
        setRecommendedJobs([]);
        return;
      }

      if (data.success) {
        setOnboardingRequired(false);
        setRecommendedJobs(data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommended jobs:', err);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const fetchMatchStats = async () => {
    try {
      const res = await fetch('/api/candidate/match-stats');
      const data = await res.json();
      if (data.success && data.data) {
        setMatchStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch match stats:', err);
    }
  };

  const fetchSavedJobs = async () => {
    try {
      setLoadingJobs(true);
      const res = await fetch('/api/candidate/saved-jobs');
      const data = await res.json();
      if (data.success) {
        setSavedJobs(data.savedJobs || []);
      }
    } catch (err) {
      console.error('Failed to fetch saved jobs:', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'recommended') {
      fetchRecommendedJobs();
      fetchMatchStats();
    } else if (activeTab === 'saved') {
      fetchSavedJobs();
    }
  }, [activeTab, minScoreFilter, workModelRec]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.dispatchEvent(new CustomEvent('buscavag:auth-changed'));
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Funções do Perfil
  const handleAddSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = skillInput.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  const toggleWorkModel = (model: string) => {
    setProfile((prev) => {
      const exists = prev.preferred_work_models.includes(model);
      return {
        ...prev,
        preferred_work_models: exists
          ? prev.preferred_work_models.filter((m) => m !== model)
          : [...prev.preferred_work_models, model],
      };
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileFeedback(null);

    try {
      const res = await fetch('/api/candidate/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProfileFeedback({ type: 'success', message: 'Perfil atualizado com sucesso!' });
        setOnboardingRequired(false);
        fetchRecommendedJobs();
        fetchMatchStats();
        setTimeout(() => setProfileFeedback(null), 4000);
      } else {
        setProfileFeedback({ type: 'error', message: data.error || 'Erro ao salvar perfil' });
      }
    } catch {
      setProfileFeedback({ type: 'error', message: 'Erro de comunicação ao salvar perfil' });
    } finally {
      setSavingProfile(false);
    }
  };

  // Funções de Currículo
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const formData = new FormData();
    formData.append('resume', file);

    setUploadingResume(true);
    setResumeFeedback(null);

    try {
      const res = await fetch('/api/candidate/resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResume({
          id: data.resume.id,
          filename: data.resume.filename,
          fileSize: data.resume.file_size,
          fileType: data.resume.file_type,
          uploadedAt: data.resume.uploaded_at,
          ai_analysis: null,
          analyzedAt: null,
        });
        setResumeFeedback({ type: 'success', message: 'Currículo enviado com sucesso!' });
        setTimeout(() => setResumeFeedback(null), 4000);
      } else {
        setResumeFeedback({ type: 'error', message: data.error || 'Erro no upload' });
      }
    } catch {
      setResumeFeedback({ type: 'error', message: 'Erro de comunicação no upload' });
    } finally {
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyzeResume = async () => {
    if (!resume) return;

    setAnalyzingResume(true);
    setResumeFeedback(null);

    try {
      const res = await fetch('/api/candidate/analyze-cv', {
        method: 'POST',
      });
      const data = await res.json();

      if (res.status === 403) {
        setResumeFeedback({
          type: 'error',
          message: data.message || 'Re-análise restrita ao plano Pro. Faça o upgrade para reanalisar seu CV ilimitadamente!',
        });
        setTimeout(() => {
          setIsUpgradeModalOpen(true);
        }, 1200);
        return;
      }

      if (res.ok && data.success) {
        setResume((prev) => (prev ? { ...prev, ai_analysis: data.analysis, analyzedAt: data.analyzedAt } : null));

        // Auto-sincroniza o perfil no front-end caso a API tenha retornado o perfil atualizado
        if (data.profile) {
          setProfile({
            target_role: data.profile.target_role || profile.target_role,
            seniority: data.profile.seniority || profile.seniority,
            expected_salary: data.profile.expected_salary || profile.expected_salary,
            preferred_work_models: data.profile.preferred_work_models || profile.preferred_work_models,
            skills: data.profile.skills || profile.skills,
            bio: data.profile.bio || profile.bio,
            city: data.profile.city ?? profile.city,
            state: data.profile.state ?? profile.state,
          });
        }

        // Desbloqueia e recarrega imediatamente as vagas recomendadas e estatísticas de match
        setOnboardingRequired(false);
        fetchRecommendedJobs();
        fetchMatchStats();

        const count = data.analysis?.hard_skills?.length || 0;
        setResumeFeedback({
          type: 'success',
          message: data.message || `Análise concluída com sucesso! ${count} competências sincronizadas com seu perfil.`,
        });
        setTimeout(() => setResumeFeedback(null), 6000);
      } else {
        setResumeFeedback({ type: 'error', message: data.error || 'Erro ao processar análise' });
      }
    } catch {
      setResumeFeedback({ type: 'error', message: 'Erro de comunicação com o servidor de IA' });
    } finally {
      setAnalyzingResume(false);
    }
  };

  const handleSyncSkills = async (
    skillsToSync: string[],
    detectedRole?: string,
    detectedSeniority?: string,
    summary?: string
  ) => {
    if (!skillsToSync || skillsToSync.length === 0) return;

    setSyncingSkills(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/candidate/sync-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skills: skillsToSync,
          detectedRole,
          detectedSeniority,
          summary,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.profile) {
          setProfile({
            target_role: data.profile.target_role || profile.target_role,
            seniority: data.profile.seniority || profile.seniority,
            expected_salary: data.profile.expected_salary || profile.expected_salary,
            preferred_work_models: data.profile.preferred_work_models || profile.preferred_work_models,
            skills: data.profile.skills || profile.skills,
            bio: data.profile.bio || profile.bio,
            city: data.profile.city ?? profile.city,
            state: data.profile.state ?? profile.state,
          });
        }

        // Desbloqueia e recarrega as vagas imediatamente
        setOnboardingRequired(false);
        fetchRecommendedJobs();
        fetchMatchStats();

        setSyncFeedback('Habilidades sincronizadas com o seu perfil e vagas recomendadas atualizadas!');
        setTimeout(() => setSyncFeedback(null), 4000);
      } else {
        setSyncFeedback(data.error || 'Falha ao sincronizar');
      }
    } catch {
      setSyncFeedback('Erro de comunicação ao sincronizar habilidades');
    } finally {
      setSyncingSkills(false);
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm('Deseja realmente remover seu currículo?')) return;

    try {
      const res = await fetch('/api/candidate/resume', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setResume(null);
        setResumeFeedback({ type: 'success', message: 'Currículo removido com sucesso' });
        setTimeout(() => setResumeFeedback(null), 4000);
      }
    } catch {
      setResumeFeedback({ type: 'error', message: 'Erro ao remover currículo' });
    }
  };

  // Funções de Vagas Salvas & Match
  const handleToggleJob = async (jobId: string, currentStatus: string = 'saved') => {
    try {
      const res = await fetch('/api/candidate/saved-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, status: currentStatus }),
      });
      const data = await res.json();

      if (res.status === 403 || data.limitReached) {
        setIsUpgradeModalOpen(true);
        return;
      }

      if (data.success) {
        setRecommendedJobs((prev) =>
          prev.map((item) => (item.job.id === jobId ? { ...item, isSaved: data.isSaved } : item))
        );
        if (!data.isSaved) {
          setSavedJobs((prev) => prev.filter((item) => item.job_id !== jobId));
        } else {
          fetchSavedJobs();
        }
      }
    } catch (err) {
      console.error('Error toggling job:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-zinc-500 font-mono text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          <span>Carregando painel do candidato...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[65vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-8 text-center shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 mb-4 border border-zinc-200 dark:border-zinc-700">
            <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Acesse o Painel do Candidato
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            Faça login ou crie sua conta para gerenciar seu perfil profissional, fazer upload do seu currículo e acompanhar o match semântico em centenas de vagas tech monitoradas.
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/login"
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar na Minha Conta</span>
            </Link>
            <Link
              href="/register"
              className="w-full py-2.5 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Criar Conta Gratuita</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl w-full mx-auto space-y-6">
      {/* Header do Usuário */}
      <CandidateHeader
        user={user}
        onUpgradeClick={() => setIsUpgradeModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Navegação por Abas */}
      <CandidateTabs
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          const url = new URL(window.location.href);
          url.searchParams.set('tab', tab);
          window.history.pushState({}, '', url.toString());
        }}
        recommendedCount={recommendedJobs.length}
        savedCount={savedJobs.length}
        hasResume={Boolean(resume)}
      />

      {/* Conteúdo das Abas */}
      {activeTab === 'recommended' && (
        <RecommendedTab
          user={user}
          recommendedJobs={recommendedJobs}
          loadingRecommended={loadingRecommended}
          minScoreFilter={minScoreFilter}
          onMinScoreChange={setMinScoreFilter}
          searchRec={searchRec}
          onSearchChange={setSearchRec}
          workModelRec={workModelRec}
          onWorkModelChange={setWorkModelRec}
          onRefresh={fetchRecommendedJobs}
          matchStats={matchStats}
          onboardingRequired={onboardingRequired}
          onUpgradeClick={() => setIsUpgradeModalOpen(true)}
          onSaveToggle={(jobId) => handleToggleJob(jobId, 'saved')}
          onOpenModal={(item) => setSelectedJobModal(toProcessedJob(item.job, item.match))}
          onGoToProfile={() => setActiveTab('profile')}
          onGoToResume={() => setActiveTab('resume')}
        />
      )}

      {activeTab === 'profile' && (
        <ProfileTab
          profile={profile}
          setProfile={setProfile}
          skillInput={skillInput}
          setSkillInput={setSkillInput}
          savingProfile={savingProfile}
          profileFeedback={profileFeedback}
          onAddSkill={handleAddSkill}
          onRemoveSkill={handleRemoveSkill}
          onToggleWorkModel={toggleWorkModel}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {activeTab === 'resume' && (
        <ResumeTab
          user={user}
          resume={resume}
          uploadingResume={uploadingResume}
          analyzingResume={analyzingResume}
          syncingSkills={syncingSkills}
          resumeFeedback={resumeFeedback}
          syncFeedback={syncFeedback}
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          onAnalyzeResume={handleAnalyzeResume}
          onDeleteResume={handleDeleteResume}
          onSyncSkills={handleSyncSkills}
          onUpgradeClick={() => setIsUpgradeModalOpen(true)}
        />
      )}

      {activeTab === 'saved' && (
        <SavedJobsTab
          savedJobs={savedJobs}
          loadingJobs={loadingJobs}
          onRemoveJob={(jobId, status) => handleToggleJob(jobId, status)}
          onOpenModal={(job) => setSelectedJobModal(toProcessedJob(job))}
          onGoToRecommended={() => setActiveTab('recommended')}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSuccess={() => {
          fetchSession();
          fetchRecommendedJobs();
          fetchSavedJobs();
        }}
      />

      {/* Job Details Modal & Pitch */}
      {selectedJobModal && (
        <JobModal
          job={selectedJobModal}
          onClose={() => setSelectedJobModal(null)}
          candidateProfile={{
            name: user?.name,
            target_role: profile.target_role,
            primary_stack: resume?.ai_analysis?.primary_stack || [],
            skills: profile.skills,
          }}
          onStatusChange={(jobId, newStatus) => {
            handleToggleJob(jobId, newStatus);
          }}
        />
      )}
    </div>
  );
}

export default function CandidateDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="flex items-center gap-2.5 text-zinc-500 font-mono text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Carregando painel do candidato...</span>
          </div>
        </div>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}
