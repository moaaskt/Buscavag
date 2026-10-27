'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Briefcase,
  DollarSign,
  Tag,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  Building,
  Plus,
  Sparkles,
} from 'lucide-react';
import { ProfileData } from './types';

interface ProfileTabProps {
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData>>;
  skillInput: string;
  setSkillInput: (input: string) => void;
  savingProfile: boolean;
  profileFeedback: { type: 'success' | 'error'; message: string } | null;
  onAddSkill: (e: React.KeyboardEvent | React.MouseEvent) => void;
  onRemoveSkill: (skill: string) => void;
  onToggleWorkModel: (model: string) => void;
  onSaveProfile: (e: React.FormEvent) => void;
}

const POPULAR_TECHS = [
  'TypeScript', 'React', 'Node.js', 'Next.js', 'PHP', 'Docker',
  'PostgreSQL', 'Python', 'Tailwind CSS', 'Git', 'Golang', 'MySQL',
];

const TECH_CATALOG = [
  // Linguagens
  'TypeScript', 'JavaScript', 'Node.js', 'Python', 'PHP', 'Golang', 'Java', 'C#', '.NET',
  'C++', 'Rust', 'Ruby', 'Rails', 'Kotlin', 'Swift', 'SQL',
  // Frontend & Mobile
  'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'React Native', 'Flutter', 'Tailwind CSS',
  'HTML5', 'CSS3', 'Sass', 'Bootstrap', 'Styled Components', 'Redux', 'Zustand',
  // Backend & Frameworks
  'NestJS', 'Express', 'FastAPI', 'Django', 'Flask', 'Laravel', 'Spring Boot', 'ASP.NET Core',
  'GraphQL', 'REST APIs', 'gRPC', 'WebSockets', 'Microserviços',
  // Bancos de Dados & ORMs
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Supabase', 'Firebase', 'Prisma', 'TypeORM',
  // DevOps, Cloud & Infra
  'Docker', 'Kubernetes', 'AWS', 'Google Cloud', 'Azure', 'Linux', 'Git', 'GitHub Actions', 'CI/CD',
  // Testes & Qualidade
  'Jest', 'Cypress', 'Playwright', 'Vitest', 'TDD', 'Clean Architecture',
  // Dados & IA
  'Machine Learning', 'IA', 'Pandas', 'NumPy', 'PyTorch', 'TensorFlow', 'OpenAI',
  // IoT & Embarcados
  'IoT', 'ESP32', 'Arduino', 'Raspberry Pi', 'MQTT', 'Automação',
];

export function ProfileTab({
  profile,
  setProfile,
  skillInput,
  setSkillInput,
  savingProfile,
  profileFeedback,
  onAddSkill,
  onRemoveSkill,
  onToggleWorkModel,
  onSaveProfile,
}: ProfileTabProps) {
  const ufs = [
    'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
    'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
  ];

  const workModels = ['Remoto', 'Híbrido', 'Presencial'];
  const requiresLocation =
    profile.preferred_work_models.includes('Presencial') ||
    profile.preferred_work_models.includes('Híbrido');

  // Estado do Autocomplete / Combobox
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra sugestões baseadas no que o usuário digita
  const query = skillInput.trim().toLowerCase();
  const suggestions = query
    ? TECH_CATALOG.filter(
        (tech) =>
          !profile.skills.includes(tech) &&
          tech.toLowerCase().includes(query)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    if (suggestions.length > 0) {
      setIsDropdownOpen(true);
      setHighlightedIndex(0);
    } else {
      setIsDropdownOpen(false);
    }
  }, [skillInput]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addSpecificSkill = (skillName: string) => {
    const trimmed = skillName.trim();
    if (trimmed && !profile.skills.includes(trimmed)) {
      setProfile((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmed],
      }));
      setSkillInput('');
      setIsDropdownOpen(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isDropdownOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          addSpecificSkill(suggestions[highlightedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      onAddSkill(e);
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/60 p-6 md:p-8 backdrop-blur-xl shadow-xs">
      <div className="mb-6 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Perfil Profissional & Preferências
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Essas informações alimentam o motor de cálculo semântico para encontrar as oportunidades mais compatíveis com o seu momento de carreira.
        </p>
      </div>

      {profileFeedback && (
        <div
          className={`mb-6 flex items-center gap-2.5 rounded-xl border p-3 text-xs animate-in fade-in duration-200 ${
            profileFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
              : 'border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {profileFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{profileFeedback.message}</span>
        </div>
      )}

      <form onSubmit={onSaveProfile} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Cargo Alvo */}
          <div>
            <label htmlFor="target_role" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Cargo Alvo Desejado
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                id="target_role"
                type="text"
                value={profile.target_role || ''}
                onChange={(e) => setProfile({ ...profile, target_role: e.target.value })}
                placeholder="Ex: Desenvolvedor Full Stack, Frontend React"
                className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Senioridade */}
          <div>
            <label htmlFor="seniority" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Senioridade
            </label>
            <select
              id="seniority"
              value={profile.seniority || 'Júnior'}
              onChange={(e) => setProfile({ ...profile, seniority: e.target.value })}
              className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs cursor-pointer"
            >
              <option value="Estágio">Estágio</option>
              <option value="Júnior">Júnior</option>
              <option value="Pleno">Pleno</option>
              <option value="Sênior">Sênior</option>
              <option value="Especialista / Tech Lead">Especialista / Tech Lead</option>
            </select>
          </div>

          {/* Pretensão Salarial */}
          <div>
            <label htmlFor="expected_salary" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Pretensão Salarial Mensal (R$)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                id="expected_salary"
                type="text"
                value={profile.expected_salary || ''}
                onChange={(e) => setProfile({ ...profile, expected_salary: e.target.value })}
                placeholder="Ex: 4500 ou 4.500"
                className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs"
              />
            </div>
          </div>

          {/* Modelos de Trabalho */}
          <div>
            <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Modelos de Trabalho Preferidos
            </span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {workModels.map((model) => {
                const isSelected = profile.preferred_work_models.includes(model);
                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => onToggleWorkModel(model)}
                    className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition-colors shadow-2xs ${
                      isSelected
                        ? 'border-emerald-600/40 bg-emerald-600 text-white font-semibold shadow-xs'
                        : 'border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {model}
                  </button>
                );
              })}
            </div>

            {requiresLocation && !profile.city && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Adicione sua cidade abaixo para compatibilidade geográfica precisa em vagas híbridas e presenciais.</span>
              </p>
            )}
          </div>

          {/* Localização (Cidade e UF) */}
          <div className="grid grid-cols-3 gap-2.5 md:col-span-2">
            <div className="col-span-2">
              <label htmlFor="city" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Cidade
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  id="city"
                  type="text"
                  value={profile.city || ''}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value || null })}
                  placeholder="Ex: Florianópolis"
                  className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs"
                />
              </div>
            </div>
            <div>
              <label htmlFor="state" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Estado (UF)
              </label>
              <select
                id="state"
                value={profile.state || ''}
                onChange={(e) => setProfile({ ...profile, state: e.target.value || null })}
                className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs cursor-pointer"
              >
                <option value="">UF</option>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Habilidades & Tecnologias com Autocomplete / Combobox */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="skillInput" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Habilidades & Tecnologias
            </label>
            <span className="text-[11px] text-zinc-400 font-mono">
              {profile.skills.length} selecionadas
            </span>
          </div>

          <div className="relative">
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                <input
                  ref={inputRef}
                  id="skillInput"
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (suggestions.length > 0) setIsDropdownOpen(true);
                  }}
                  placeholder="Digite uma tecnologia (ex: TypeScript, React, PHP, Docker...)"
                  className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors shadow-2xs"
                  autoComplete="off"
                />
              </div>

              <button
                type="button"
                onClick={onAddSkill}
                className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>

            {/* Dropdown Flutuante do Combobox */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute z-30 left-0 right-0 top-11 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-lg p-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Sugestões correspondentes (Pressione Enter para selecionar)
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {suggestions.map((item, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => addSpecificSkill(item)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition-colors ${
                          isHighlighted
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <span>{item}</span>
                        <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Adicionar
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chips de Sugestões Populares para 1-clique */}
          <div className="mb-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 shrink-0 mr-1">
              <Sparkles className="w-3 h-3 text-emerald-500" />
              <span>Populares:</span>
            </span>
            {POPULAR_TECHS.filter((t) => !profile.skills.includes(t))
              .slice(0, 8)
              .map((tech) => (
                <button
                  key={tech}
                  type="button"
                  onClick={() => addSpecificSkill(tech)}
                  className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700/80 bg-zinc-50/60 dark:bg-zinc-900/60 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 px-2 py-0.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
                >
                  <Plus className="w-2.5 h-2.5 opacity-60" />
                  <span>{tech}</span>
                </button>
              ))}
          </div>

          {/* Lista de Habilidades Adicionadas */}
          <div className="flex flex-wrap gap-1.5 min-h-[48px] p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40">
            {profile.skills.length === 0 ? (
              <span className="text-xs text-zinc-400 italic">
                Nenhuma habilidade adicionada ainda. Digite acima ou clique nas sugestões populares.
              </span>
            ) : (
              profile.skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-xs font-mono text-zinc-800 dark:text-zinc-200 shadow-2xs"
                >
                  <span>{s}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveSkill(s)}
                    aria-label={`Remover tecnologia ${s}`}
                    className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-0.5 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Resumo Profissional / Bio */}
        <div>
          <label htmlFor="bio" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Resumo Profissional / Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            value={profile.bio || ''}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            placeholder="Apresente sua trajetória, projetos mais relevantes e foco de atuação..."
            className="w-full rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none transition-colors resize-none shadow-2xs"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium px-6 py-2.5 text-xs transition-all duration-200 disabled:opacity-50 shadow-xs hover:shadow-emerald-950/20 hover:-translate-y-0.5"
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando Perfil...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Perfil</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
