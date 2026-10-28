import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AdminFunnel from '../../components/Admin/AdminFunnel';

// ============================================================
// ADMIN DASHBOARD — Vue complète avec emails
// Adapté au schéma réel de la BDD ExtraTaff
// ============================================================

const TABS_BASE = [
  { id: 'overview', label: '🎯 Pilotage' },
  { id: 'funnel', label: '🎯 Funnel' },
  { id: 'talents', label: '👤 Talents' },
  { id: 'establishments', label: '🏪 Établissements' },
  { id: 'missions', label: '📋 Missions' },
  { id: 'applications', label: '📩 Candidatures' },
  { id: 'rdv', label: '🗓 RDV' },
  { id: 'hires', label: '🎉 Embauches' },
  { id: 'subscriptions', label: '💳 Abonnements' },
  { id: 'admins', label: '🛡️ Admins' },
];

const PAGE_SIZE = 20;

// ============================================================
// Utilitaires
// ============================================================
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Jamais';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `Il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Il y a ${days}j`;
  const months = Math.floor(days / 30);
  return `Il y a ${months} mois`;
};

const getPositionLabel = (key) => {
  const labels = {
    chef_cuisine: 'Chef de cuisine', sous_chef: 'Sous-chef', chef_partie: 'Chef de partie',
    commis: 'Commis de cuisine', plongeur: 'Plongeur', maitre_hotel: "Maître d'hôtel",
    chef_de_salle: 'Chef de salle', serveur: 'Serveur', barman: 'Barman',
    sommelier: 'Sommelier', runner: 'Runner', receptionniste: 'Réceptionniste',
    concierge: 'Concierge', gouvernante: 'Gouvernante', valet: 'Valet/Voiturier',
    manager: 'Manager', assistant_manager: 'Assistant manager'
  };
  return labels[key] || key;
};

const getSubscriptionBadge = (status, plan) => {
  if (status === 'active' && plan === 'annual') return { text: '🏆 Abonné annuel', color: 'bg-yellow-100 text-yellow-800' };
  if (status === 'active' && plan === 'club') return { text: '🏆 Abonné', color: 'bg-yellow-100 text-yellow-800' };
  if (status === 'active') return { text: '✅ Actif', color: 'bg-green-100 text-green-800' };
  return { text: 'Sans abonnement', color: 'bg-gray-100 text-gray-600' };
};

// ============================================================
// Composant : Barre de recherche
// ============================================================
const SearchBar = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Rechercher...'}
      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
    {value && (
      <button onClick={() => onChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
    )}
  </div>
);

// ============================================================
// Composant : En-tête triable
// ============================================================
const SortableHeader = ({ label, field, sortField, sortDir, onSort, className = '' }) => (
  <th
    className={`px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none ${className}`}
    onClick={() => onSort(field)}
  >
    <div className="flex items-center gap-1">
      {label}
      <span className="text-gray-300">
        {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </div>
  </th>
);

// ============================================================
// Composant : Pagination
// ============================================================
const Pagination = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-500">
        {start}–{end} sur {totalItems}
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ←
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let page;
          if (totalPages <= 7) {
            page = i + 1;
          } else if (currentPage <= 4) {
            page = i + 1;
          } else if (currentPage >= totalPages - 3) {
            page = totalPages - 6 + i;
          } else {
            page = currentPage - 3 + i;
          }
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm rounded border ${
                currentPage === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-1 text-sm rounded border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          →
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Composant : Modal détail talent
// ============================================================
const TalentDetailModal = ({ item, onClose }) => {
  if (!item) return null;

  const fields = [
    { label: 'ID', value: item.id },
    { label: 'User ID', value: item.user_id },
    { label: '📧 Email', value: item.email, highlight: true },
    { label: 'Prénom', value: item.first_name },
    { label: 'Nom', value: item.last_name },
    { label: '📱 Téléphone', value: item.phone, highlight: true },
    { label: 'Postes recherchés', value: item.position_types?.map(getPositionLabel).join(', ') },
    { label: 'Départements préférés', value: item.preferred_departments?.join(', ') },
    { label: 'Expérience', value: item.years_experience ? `${item.years_experience} ans` : '—' },
    { label: 'Contrats souhaités', value: item.contract_preferences?.join(', ') },
    { label: 'Types d\'établissements', value: item.establishment_types_preferences?.join(', ') },
    { label: 'Taux horaire min.', value: item.min_hourly_rate ? `${item.min_hourly_rate}€/h` : '—' },
    { label: 'Accepte coupure', value: item.accepts_coupure ? '✅ Oui' : '❌ Non' },
    { label: 'Rayon de recherche', value: item.search_radius ? `${item.search_radius} km` : '—' },
    { label: 'Bio', value: item.bio },
    { label: 'CV', value: item.cv_url ? '📄 Téléchargé' : 'Aucun' },
    { label: 'Adresse', value: [item.address, item.postal_code, item.city].filter(Boolean).join(', ') },
    { label: 'Département', value: item.department },
    { label: '⭐ Note moyenne', value: item.average_rating ? `${Number(item.average_rating).toFixed(1)}/5 (${item.total_ratings || 0} avis)` : 'Aucun avis' },
    { label: '✅ Missions complétées', value: item.total_missions_completed || 0 },
    { label: '📩 Candidatures', value: `${item.total_applications || 0} total / ${item.accepted_applications || 0} acceptées` },
    { label: '🚫 Bloqué', value: item.is_blocked ? '⛔ OUI' : '—' },
    { label: '📅 Inscription', value: formatDateTime(item.created_at) },
    { label: '🔑 Dernière connexion', value: item.last_sign_in_at ? timeAgo(item.last_sign_in_at) : 'Jamais' },
    { label: '✉️ Email confirmé', value: item.email_confirmed_at ? `✅ ${formatDate(item.email_confirmed_at)}` : '❌ Non confirmé' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">
            👤 {item.first_name} {item.last_name}
            {item.is_blocked && <span className="ml-2 text-sm text-red-600">⛔ Bloqué</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-1">
          {fields.map((f, i) => (
            <div key={i} className={`flex gap-4 py-2 ${i < fields.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className="text-sm font-medium text-gray-500 w-48 shrink-0">{f.label}</span>
              <span className={`text-sm ${f.highlight ? 'font-semibold text-blue-700' : 'text-gray-900'} break-all`}>
                {f.value || '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t px-6 py-4 flex gap-3">
          <button
            onClick={() => { navigator.clipboard.writeText(item.email || ''); alert('Email copié !'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📋 Copier l'email
          </button>
          {item.phone && (
            <button
              onClick={() => { navigator.clipboard.writeText(item.phone); alert('Téléphone copié !'); }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              📋 Copier le tél.
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm ml-auto">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Composant : Modal détail établissement
// ============================================================
const EstablishmentDetailModal = ({ item, onClose }) => {
  if (!item) return null;

  const fields = [
    { label: 'ID', value: item.id },
    { label: 'User ID', value: item.user_id },
    { label: '📧 Email', value: item.email, highlight: true },
    { label: 'Nom', value: item.name },
    { label: 'Type', value: item.type },
    { label: '📱 Téléphone', value: item.phone, highlight: true },
    { label: 'Adresse', value: item.address },
    { label: 'Ville', value: item.city },
    { label: 'Code postal', value: item.postal_code },
    { label: 'Département', value: item.department },
    { label: 'Description', value: item.description },
    { label: '💳 Statut abo', value: item.subscription_status === 'freemium' || !item.subscription_status ? 'Sans abonnement' : item.subscription_status },
    { label: '💳 Plan', value: item.subscription_plan || '—' },
    { label: 'Stripe Customer', value: item.stripe_customer_id },
    { label: 'Stripe Subscription', value: item.stripe_subscription_id },
    { label: 'Début abo', value: formatDate(item.subscription_started_at) },
    { label: 'Fin abo', value: formatDate(item.subscription_ends_at) },
    { label: 'Missions créées', value: item.missions_used },
    { label: '📊 Total missions', value: `${item.total_missions || 0} (${item.active_missions || 0} actives)` },
    { label: '📩 Candidatures reçues', value: item.total_applications_received || 0 },
    { label: 'Groupe', value: item.group_id || '—' },
    { label: 'Propriétaire groupe', value: item.is_group_owner ? '✅ Oui' : '—' },
    { label: '🚫 Bloqué', value: item.is_blocked ? '⛔ OUI' : '—' },
    { label: '📅 Inscription', value: formatDateTime(item.created_at) },
    { label: '🔑 Dernière connexion', value: item.last_sign_in_at ? timeAgo(item.last_sign_in_at) : 'Jamais' },
    { label: '✉️ Email confirmé', value: item.email_confirmed_at ? `✅ ${formatDate(item.email_confirmed_at)}` : '❌ Non confirmé' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold">
            🏪 {item.name}
            {item.is_blocked && <span className="ml-2 text-sm text-red-600">⛔ Bloqué</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <div className="px-6 py-4 space-y-1">
          {fields.map((f, i) => (
            <div key={i} className={`flex gap-4 py-2 ${i < fields.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <span className="text-sm font-medium text-gray-500 w-48 shrink-0">{f.label}</span>
              <span className={`text-sm ${f.highlight ? 'font-semibold text-blue-700' : 'text-gray-900'} break-all`}>
                {f.value || '—'}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t px-6 py-4 flex gap-3">
          <button
            onClick={() => { navigator.clipboard.writeText(item.email || ''); alert('Email copié !'); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            📋 Copier l'email
          </button>
          {item.phone && (
            <button
              onClick={() => { navigator.clipboard.writeText(item.phone); alert('Téléphone copié !'); }}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm"
            >
              📋 Copier le tél.
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm ml-auto">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Composant : Export CSV
// ============================================================
const exportCSV = (data, filename, columns) => {
  const BOM = '\uFEFF';
  const header = columns.map(c => c.label).join(';');
  const rows = data.map(item =>
    columns.map(c => {
      let val = c.accessor(item);
      if (val === null || val === undefined) return '';
      if (Array.isArray(val)) val = val.join(', ');
      val = String(val).replace(/"/g, '""');
      if (val.includes(';') || val.includes('"') || val.includes('\n')) {
        val = `"${val}"`;
      }
      return val;
    }).join(';')
  );
  const csv = BOM + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `${filename}_${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================
// ============================================================
// Pilotage : petits composants d'affichage
// ============================================================
const pct = (n, d) => (d ? `${Math.round((Number(n) / Number(d)) * 100)} %` : '—');
const eur = (n) => `${Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

const TONES = {
  gray: 'bg-white border-gray-200',
  blue: 'bg-blue-50 border-blue-200',
  green: 'bg-green-50 border-green-200',
  amber: 'bg-amber-50 border-amber-200',
  red: 'bg-red-50 border-red-200',
  purple: 'bg-purple-50 border-purple-200',
};

const ZONE_LABELS = {
  paris_idf: 'Paris Île-de-France',
  calvados: 'Calvados',
  autre: 'Autres départements',
  inconnu: 'Non renseigné',
};

const BILLING_LABELS = {
  free_first: '🎁 Première mission offerte',
  single: '💶 Mission à l\'unité',
  pack: '📦 Pack de missions',
  subscription: '🏆 Abonnement',
  legacy_paid: 'Ancienne offre payante',
  legacy_free: 'Ancienne offre gratuite',
  admin: 'Offerte par l\'administrateur',
  non_renseigne: 'Non renseigné',
};

const Kpi = ({ icon, label, value, hint, tone = 'gray' }) => (
  <div className={`rounded-xl border p-4 shadow-sm ${TONES[tone] || TONES.gray}`}>
    <div className="flex items-center gap-2">
      <span className="text-lg">{icon}</span>
      <span className="text-2xl font-bold text-gray-900">{value}</span>
    </div>
    <div className="text-sm text-gray-600 mt-1">{label}</div>
    {hint && <div className="text-xs text-gray-400 mt-0.5">{hint}</div>}
  </div>
);

const Block = ({ title, subtitle, children }) => (
  <section className="space-y-4">
    <div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
    {children}
  </section>
);

const MiniTable = ({ columns, rows, empty = 'Rien à signaler' }) => (
  rows && rows.length > 0 ? (
    <div className="overflow-x-auto rounded-xl border shadow-sm bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((c, i) => (
              <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, ri) => (
            <tr key={r.id || ri} className="hover:bg-gray-50">
              {columns.map((c, ci) => (
                <td key={ci} className="px-3 py-2 text-sm">{c.render(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-sm text-gray-400 py-3">{empty}</p>
  )
);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data
  const [talents, setTalents] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [missions, setMissions] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [pilotage, setPilotage] = useState(null);
  const [pilotageError, setPilotageError] = useState(null);

  // UI state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null);

  // RDV & Embauches
  const [appointments, setAppointments] = useState([]);
  const [hires, setHires] = useState([]);

  // Admins
  const [admins, setAdmins] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  // Tabs avec compteurs dynamiques
  const TABS = TABS_BASE.map(tab => {
    const counts = {
      talents: talents.length,
      establishments: establishments.length,
      missions: missions.length,
      applications: applications.length,
      rdv: appointments.length,
      hires: hires.length,
      admins: admins.length,
    };
    return counts[tab.id] !== undefined
      ? { ...tab, label: `${tab.label} (${counts[tab.id]})` }
      : tab;
  });

  // Reset on tab change
  useEffect(() => {
    setSearch('');
    setSortField('created_at');
    setSortDir('desc');
    setCurrentPage(1);
    setSelectedIds(new Set());
    setDetailItem(null);
  }, [activeTab]);

  // ============================================================
  // Chargement des données
  // ============================================================
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Charger talents via RPC (avec emails)
      const { data: talentsData, error: talentsErr } = await supabase.rpc('get_admin_talents');
      if (talentsErr) {
        console.error('Erreur RPC talents:', talentsErr);
        // Fallback : requête directe sans emails
        const { data: fallbackTalents } = await supabase.from('talents').select('*').order('created_at', { ascending: false });
        setTalents((fallbackTalents || []).map(t => ({ ...t, email: '⚠️ Exécuter le SQL d\'abord', last_sign_in_at: null, email_confirmed_at: null })));
      } else {
        setTalents(talentsData || []);
      }

      // Charger établissements via RPC (avec emails)
      const { data: estData, error: estErr } = await supabase.rpc('get_admin_establishments');
      if (estErr) {
        console.error('Erreur RPC établissements:', estErr);
        const { data: fallbackEst } = await supabase.from('establishments').select('*').order('created_at', { ascending: false });
        setEstablishments((fallbackEst || []).map(e => ({ ...e, email: '⚠️ Exécuter le SQL d\'abord', last_sign_in_at: null, email_confirmed_at: null })));
      } else {
        setEstablishments(estData || []);
      }

      // Charger missions
      const { data: missionsData } = await supabase
        .from('missions')
        .select('*, establishments(name)')
        .order('created_at', { ascending: false });
      setMissions(missionsData || []);

      // Charger candidatures via RPC (bypass RLS)
      const { data: appsData, error: appsErr } = await supabase.rpc('get_admin_applications');
      if (appsErr) {
        console.error('Erreur RPC applications:', appsErr);
        // Fallback : requête directe
        const { data: fallbackApps } = await supabase
          .from('applications')
          .select('*, talents(first_name, last_name), missions(position, establishments(name))')
          .order('created_at', { ascending: false });
        setApplications(fallbackApps || []);
      } else {
        // Reformater pour garder la même structure que l'affichage
        setApplications((appsData || []).map(a => ({
          ...a,
          talents: { first_name: a.talent_first_name, last_name: a.talent_last_name },
          missions: { position: a.mission_position, establishments: { name: a.establishment_name } }
        })));
      }

      // Stats globales via RPC
      const { data: statsData, error: statsErr } = await supabase.rpc('get_admin_stats');
      if (!statsErr && statsData) {
        setStats(statsData);
      }

      // Pilotage (comptes de test exclus) : inscriptions, relances, paiements, santé
      const { data: pilotageData, error: pilotageErr } = await supabase.rpc('get_admin_pilotage');
      if (pilotageErr) {
        console.error('Erreur RPC pilotage:', pilotageErr);
        setPilotageError(pilotageErr.message || 'fonction indisponible');
        setPilotage(null);
      } else {
        setPilotageError(null);
        setPilotage(pilotageData);
      }

      // Charger admins
      const { data: adminsData } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });
      setAdmins(adminsData || []);

      // Charger RDV
      const { data: apptData } = await supabase
        .from('appointments')
        .select(`
          id, scheduled_at, address, note, status, created_at,
          applications (
            id,
            talents!talent_id ( first_name, last_name ),
            missions ( position, establishments ( name ) )
          )
        `)
        .order('scheduled_at', { ascending: false });
      setAppointments(apptData || []);

      // Charger embauches
      const { data: hiresData } = await supabase
        .from('applications')
        .select(`
          id, confirmed_at, created_at, hire_status,
          talents!talent_id ( first_name, last_name ),
          missions ( position, start_date, establishments ( name ) )
        `)
        .eq('hire_status', 'hired')
        .order('confirmed_at', { ascending: false });
      setHires(hiresData || []);

    } catch (err) {
      console.error('Erreur chargement admin:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // Tri & Filtrage & Pagination
  // ============================================================
  const sortData = (data) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const filterData = (data, fields) => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter(item =>
      fields.some(f => {
        const val = item[f];
        if (Array.isArray(val)) return val.some(v => String(v).toLowerCase().includes(q));
        return val && String(val).toLowerCase().includes(q);
      })
    );
  };

  const paginate = (data) => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return data.slice(start, start + PAGE_SIZE);
  };

  // ============================================================
  // Sélection multiple
  // ============================================================
  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = (items) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleBulkDelete = async (table) => {
    if (!selectedIds.size) return;
    if (!confirm(`Supprimer ${selectedIds.size} élément(s) ?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from(table).delete().in('id', ids);
    if (error) {
      alert('Erreur de suppression: ' + error.message);
    } else {
      setSelectedIds(new Set());
      loadData();
    }
  };

  // Bloquer / Débloquer un talent ou établissement
  const handleToggleBlock = async (table, id, currentlyBlocked, name) => {
    const action = currentlyBlocked ? 'Débloquer' : 'Bloquer';
    if (!confirm(`${action} "${name}" ?`)) return;
    const { error } = await supabase.from(table).update({
      is_blocked: !currentlyBlocked,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      loadData();
    }
  };

  // Bloquer en masse
  const handleBulkBlock = async (table, block = true) => {
    if (!selectedIds.size) return;
    const action = block ? 'Bloquer' : 'Débloquer';
    if (!confirm(`${action} ${selectedIds.size} élément(s) ?`)) return;
    const ids = Array.from(selectedIds);
    const { error } = await supabase.from(table).update({
      is_blocked: block,
      updated_at: new Date().toISOString()
    }).in('id', ids);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setSelectedIds(new Set());
      loadData();
    }
  };

  // Offrir une mission à un établissement : un crédit valable 60 jours (même logique que l'achat d'un pack)
  const handleGrantMission = async (id, name) => {
    if (!confirm(`Offrir une mission à "${name}" ? Un crédit valable 60 jours sera ajouté à son compte.`)) return;
    const { data: est, error: readError } = await supabase
      .from('establishments').select('pack_credits, pack_expires_at').eq('id', id).single();
    if (readError) {
      alert('Erreur: ' + readError.message);
      return;
    }
    const now = new Date();
    const validUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const currentExpiry = est?.pack_expires_at ? new Date(est.pack_expires_at) : null;
    const stillValid = currentExpiry && currentExpiry > now && (est.pack_credits || 0) > 0;
    const { error } = await supabase.from('establishments').update({
      pack_credits: (stillValid ? (est.pack_credits || 0) : 0) + 1,
      pack_expires_at: (stillValid && currentExpiry > validUntil ? currentExpiry : validUntil).toISOString(),
      updated_at: now.toISOString()
    }).eq('id', id);
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      loadData();
    }
  };

  // ============================================================
  // ONGLET : Pilotage (inscriptions, relances, paiements, santé) — comptes de test exclus
  // ============================================================
  const renderOverview = () => {
    if (!pilotage) {
      return (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          {pilotageError
            ? <>Le pilotage n'est pas disponible : <strong>{pilotageError}</strong>. Vérifier que le fichier SQL « 21-admin-pilotage.sql » a bien été exécuté dans Supabase.</>
            : 'Chargement du pilotage…'}
        </div>
      );
    }

    const P = pilotage;
    const c = P.comptes || {};
    const ins = P.inscriptions || {};
    const act = P.activation || {};
    const f = P.funnel || {};
    const rel = P.relance || {};
    const pay = P.paiements || {};
    const off = P.offre || {};
    const sante = P.sante || {};
    const delai = sante.delai_premiere_candidature || {};
    const al = sante.alertes || {};
    const rap = sante.rappels || {};
    const joursOffre = Math.max(0, Math.ceil((new Date('2026-12-01T00:00:00+01:00') - new Date()) / 86400000));

    const funnelSteps = [
      { label: '1. Établissements inscrits', value: f.inscrits || 0 },
      { label: '2. Ont publié une mission', value: f.ont_publie || 0 },
      { label: '3. Ont reçu une candidature', value: f.ont_recu_candidature || 0 },
      { label: '4. Ont accepté un candidat', value: f.ont_accepte || 0 },
      { label: '5. Ont payé (mission, pack ou abonnement)', value: f.ont_paye || 0 },
    ];

    const zoneRows = ['paris_idf', 'calvados', 'autre', 'inconnu'].map((z) => ({
      id: z,
      zone: ZONE_LABELS[z],
      etablissements: ins.etablissements_par_zone?.[z] || 0,
      talents: ins.talents_par_zone?.[z] || 0,
    }));

    const contactCell = (r) => (
      <div className="text-xs leading-5">
        <div className="font-medium">{r.telephone ? `📱 ${r.telephone}` : '📱 —'}</div>
        <div className="text-blue-700">{r.email || '—'}</div>
      </div>
    );

    return (
      <div className="space-y-10">
        {/* En-tête */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-500">
            Chiffres en direct, <strong>comptes de test exclus</strong> · mis à jour {timeAgo(P.genere_le)}
          </p>
          <button
            onClick={loadData}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* ===== Bloc 1 : inscriptions et activation ===== */}
        <Block title="📥 Inscriptions et activation" subtitle="Qui s'inscrit, et qui passe à l'action">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon="🏪" label="Établissements inscrits" value={c.etablissements ?? 0} tone="green" />
            <Kpi icon="👤" label="Candidats inscrits" value={c.talents ?? 0} tone="blue" />
            <Kpi icon="📋" label="Ont publié au moins une mission" value={act.etablissements_avec_mission ?? 0} hint={pct(act.etablissements_avec_mission, c.etablissements)} />
            <Kpi icon="💤" label="Inscrits sans mission" value={act.etablissements_sans_mission ?? 0} tone="amber" hint="à appeler" />
            <Kpi icon="🔥" label="Missions ouvertes" value={act.missions_ouvertes ?? 0} />
            <Kpi icon="📩" label="Candidatures par mission" value={act.candidatures_par_mission ?? 0} hint={`${act.missions_avec_candidature ?? 0} / ${act.missions_publiees ?? 0} missions en ont reçu`} />
            <Kpi icon="🚧" label="Missions au plafond (10)" value={act.missions_au_plafond ?? 0} hint={`${act.candidatures_en_attente ?? 0} en liste d'attente`} />
            <Kpi icon="🎉" label="Embauches" value={act.embauches ?? 0} tone="purple" />
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">🔄 Parcours des établissements</h4>
            {funnelSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm w-72 shrink-0">{step.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6">
                  <div
                    className="bg-blue-500 rounded-full h-6 flex items-center justify-end pr-2 text-white text-xs font-medium"
                    style={{ width: `${funnelSteps[0].value ? Math.round(step.value / funnelSteps[0].value * 100) : 0}%`, minWidth: step.value > 0 ? '40px' : '0' }}
                  >
                    {step.value}
                  </div>
                </div>
                <span className="text-xs text-gray-400 w-12 text-right">{pct(step.value, funnelSteps[0].value)}</span>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📅 Inscriptions par semaine</h4>
              <MiniTable
                columns={[
                  { label: 'Semaine du', render: (r) => r.semaine },
                  { label: 'Établissements', render: (r) => r.etablissements },
                  { label: 'Candidats', render: (r) => r.talents },
                ]}
                rows={(ins.par_semaine || []).map((r, i) => ({ ...r, id: `w${i}` }))}
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📍 Où sont-ils ?</h4>
              <MiniTable
                columns={[
                  { label: 'Zone', render: (r) => r.zone },
                  { label: 'Établissements', render: (r) => r.etablissements },
                  { label: 'Candidats', render: (r) => r.talents },
                ]}
                rows={zoneRows}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📞 À appeler : inscrits qui n'ont jamais publié de mission</h4>
            <MiniTable
              columns={[
                { label: 'Établissement', render: (r) => <div><div className="font-medium">{r.nom}</div><div className="text-xs text-gray-400">{r.ville || '—'}</div></div> },
                { label: 'Contact', render: contactCell },
                { label: 'Inscrit', render: (r) => formatDate(r.inscrit_le) },
              ]}
              rows={act.sans_mission_liste}
              empty="Tous les établissements inscrits ont publié une mission"
            />
          </div>
        </Block>

        {/* ===== Bloc 2 : à relancer ===== */}
        <Block title="⏰ À relancer" subtitle="Des candidats attendent une réponse depuis plus de 24 h">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon="📭" label="Candidatures sans réponse (+24 h)" value={rel.candidatures_sans_reponse ?? 0} tone={rel.candidatures_sans_reponse > 0 ? 'amber' : 'green'} />
            <Kpi icon="🏪" label="Établissements concernés" value={rel.etablissements_concernes ?? 0} tone={rel.etablissements_concernes > 0 ? 'amber' : 'green'} />
            <Kpi icon="⏳" label="Missions qui se terminent sous 3 jours" value={rel.missions_bientot_terminees ?? 0} hint="sans candidat accepté" />
            <Kpi icon="🕐" label="Candidatures en liste d'attente" value={act.candidatures_en_attente ?? 0} />
          </div>
          <MiniTable
            columns={[
              { label: 'Établissement', render: (r) => <div><div className="font-medium">{r.nom}</div><div className="text-xs text-gray-400">{r.ville || '—'}</div></div> },
              { label: 'Contact', render: contactCell },
              { label: 'Candidats', render: (r) => <span className="font-bold text-amber-700">{r.candidats}</span> },
              { label: 'Postes', render: (r) => <span className="text-xs">{r.postes || '—'}</span> },
              { label: 'Attente', render: (r) => `${r.attente_heures} h` },
              { label: 'Dernière visite', render: (r) => (r.derniere_visite ? timeAgo(r.derniere_visite) : 'Jamais') },
              { label: 'Rappels e-mail', render: (r) => (r.rappels_envoyes > 0 ? `${r.rappels_envoyes} (dernier ${timeAgo(r.dernier_rappel)})` : 'Aucun') },
              { label: 'Alertes', render: (r) => (r.mode_alertes === 'daily' ? 'Résumé du matin' : 'À chaque candidature') },
            ]}
            rows={rel.liste}
            empty="Aucune candidature en attente depuis plus de 24 h : bravo !"
          />
        </Block>

        {/* ===== Bloc 3 : paiements et offres ===== */}
        <Block title="💳 Paiements et offres" subtitle="Grille : mission 19,90 € · pack de 3 missions 34,90 € · abonnement 14,90 €/mois jusqu'au 31/12/2026 puis 19,90 €/mois">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon="🧾" label="Établissements payeurs" value={pay.etablissements_payeurs ?? 0} tone="green" hint={pct(pay.etablissements_payeurs, c.etablissements)} />
            <Kpi icon="💶" label="Missions payées à l'unité" value={pay.missions_payees_a_l_unite ?? 0} />
            <Kpi icon="📦" label="Packs vendus" value={pay.packs_vendus ?? 0} hint={`${pay.credits_de_pack_vendus ?? 0} crédits`} />
            <Kpi icon="🏆" label="Abonnés actifs" value={pay.abonnes_actifs ?? 0} hint={`+ ${pay.abonnes_annuels_actifs ?? 0} annuel(s)`} />
            <Kpi icon="💰" label="Revenu mensuel des abonnements" value={eur(pay.abonnements_revenu_mensuel_estime)} tone="green" hint="estimé aux tarifs de la grille" />
            <Kpi icon="📈" label="Ventes estimées (missions + packs)" value={eur(pay.ventes_estimees_au_tarif_actuel)} hint="au tarif actuel : les anciens paiements étaient à d'autres prix, le réel est dans Stripe" />
            <Kpi icon="🎁" label="Premières missions offertes utilisées" value={off.premieres_missions_offertes_utilisees ?? 0} />
            <Kpi icon="⏳" label="Missions en attente de paiement" value={act.missions_en_attente_paiement ?? 0} tone={act.missions_en_attente_paiement > 0 ? 'amber' : 'gray'} hint="créées mais jamais payées" />
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex flex-wrap items-center gap-4">
            <div className="text-3xl font-bold text-purple-800">{joursOffre === 0 ? 'Terminée' : `J-${joursOffre}`}</div>
            <div className="text-sm text-purple-900">
              <strong>Offre « première mission offerte »</strong> : valable pour les inscriptions avant le 1er décembre 2026.<br />
              <strong>{off.etablissements_eligibles_non_utilisee ?? 0}</strong> établissement(s) inscrit(s) n'ont pas encore utilisé leur mission offerte.
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Missions publiées par type de facturation</h4>
              <MiniTable
                columns={[
                  { label: 'Type', render: (r) => r.label },
                  { label: 'Missions', render: (r) => r.n },
                ]}
                rows={Object.entries(off.repartition_missions || {}).map(([k, n]) => ({ id: k, label: BILLING_LABELS[k] || k, n }))}
              />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">🎁 Ont encore leur mission offerte à utiliser</h4>
              <MiniTable
                columns={[
                  { label: 'Établissement', render: (r) => <div><div className="font-medium">{r.nom}</div><div className="text-xs text-gray-400">{r.ville || '—'}</div></div> },
                  { label: 'Contact', render: contactCell },
                  { label: 'Inscrit', render: (r) => formatDate(r.inscrit_le) },
                ]}
                rows={off.eligibles_liste}
                empty="Tous les inscrits ont utilisé leur offre"
              />
            </div>
          </div>
        </Block>

        {/* ===== Bloc 4 : santé ===== */}
        <Block title="🩺 Santé de la plateforme" subtitle="Rapidité, alertes, rappels et tâches automatiques">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi icon="⚡" label="Première candidature dans l'heure" value={pct(delai.dans_l_heure, delai.missions)} tone="green" hint={`${delai.dans_l_heure ?? 0} missions sur ${delai.missions ?? 0}`} />
            <Kpi icon="⏱" label="Délai médian de la 1re candidature" value={delai.mediane_minutes != null ? `${delai.mediane_minutes} min` : '—'} />
            <Kpi icon="✅" label="Missions avec au moins une candidature" value={pct(delai.avec_candidature, delai.missions)} hint={`${delai.avec_candidature ?? 0} sur ${delai.missions ?? 0} (≤ 3 h : ${delai.dans_les_3_heures ?? 0}, ≤ 24 h : ${delai.dans_les_24_heures ?? 0})`} />
            <Kpi icon="🔔" label="Résumés du matin (7 derniers jours)" value={rap.resumes_quotidiens_7j ?? 0} hint={`${al.etablissements_mode_resume ?? 0} établissement(s) en mode résumé`} />
            <Kpi icon="📱" label="Établissements avec alertes téléphone" value={`${al.etablissements_inscrits_telephone ?? 0} / ${c.etablissements ?? 0}`} tone="amber" hint={pct(al.etablissements_inscrits_telephone, c.etablissements)} />
            <Kpi icon="📱" label="Candidats avec alertes téléphone" value={`${al.talents_inscrits_telephone ?? 0} / ${c.talents ?? 0}`} tone="amber" hint={pct(al.talents_inscrits_telephone, c.talents)} />
            <Kpi icon="✉️" label="E-mails actifs (établissements / candidats)" value={`${al.etablissements_email_actif ?? 0} / ${al.talents_email_actif ?? 0}`} />
            <Kpi icon="📨" label="Rappels e-mail envoyés" value={rap.total ?? 0} hint={`${rap.sept_derniers_jours ?? 0} sur les 7 derniers jours`} />
          </div>

          {P.taches_en_echec_24h > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ⚠️ {P.taches_en_echec_24h} exécution(s) de tâche automatique en échec sur les dernières 24 h.
            </div>
          )}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">🤖 Tâches automatiques</h4>
            <MiniTable
              columns={[
                { label: 'Tâche', render: (r) => <span className="font-mono text-xs">{r.tache}</span> },
                { label: 'Planification', render: (r) => <span className="font-mono text-xs">{r.planification}</span> },
                { label: 'Dernier passage', render: (r) => (r.dernier_passage ? timeAgo(r.dernier_passage) : 'Jamais') },
                { label: 'Résultat', render: (r) => (r.dernier_statut === 'succeeded' ? '✅ Réussi' : r.dernier_statut ? `❌ ${r.dernier_statut}` : '—') },
              ]}
              rows={(P.taches || []).map((t, i) => ({ ...t, id: `t${i}` }))}
              empty="Journal des tâches indisponible"
            />
          </div>

          <div className="text-xs text-gray-400">
            Comptes : {c.etablissements_actifs_7j ?? 0} établissement(s) et {c.talents_actifs_7j ?? 0} candidat(s) connecté(s) ces 7 derniers jours ·
            e-mail non confirmé : {c.etablissements_email_non_confirme ?? 0} / {c.talents_email_non_confirme ?? 0} ·
            bloqués : {c.etablissements_bloques ?? 0} / {c.talents_bloques ?? 0}
          </div>
        </Block>
      </div>
    );
  };

  // ============================================================
  // ONGLET : Talents (avec emails)
  // ============================================================
  const renderTalents = () => {
    const searchFields = ['email', 'first_name', 'last_name', 'phone', 'city', 'department', 'position_types', 'preferred_departments'];
    const filtered = filterData(talents, searchFields);
    const sorted = sortData(filtered);
    const paged = paginate(sorted);

    const csvColumns = [
      { label: 'Email', accessor: d => d.email },
      { label: 'Prénom', accessor: d => d.first_name },
      { label: 'Nom', accessor: d => d.last_name },
      { label: 'Téléphone', accessor: d => d.phone },
      { label: 'Postes', accessor: d => d.position_types?.map(getPositionLabel) },
      { label: 'Départements préférés', accessor: d => d.preferred_departments },
      { label: 'Expérience (années)', accessor: d => d.years_experience },
      { label: 'Contrats', accessor: d => d.contract_preferences },
      { label: 'Taux horaire min', accessor: d => d.min_hourly_rate },
      { label: 'Accepte coupure', accessor: d => d.accepts_coupure ? 'Oui' : 'Non' },
      { label: 'Ville', accessor: d => d.city },
      { label: 'Code postal', accessor: d => d.postal_code },
      { label: 'Département', accessor: d => d.department },
      { label: 'Note', accessor: d => d.average_rating ? Number(d.average_rating).toFixed(1) : '' },
      { label: 'Nb avis', accessor: d => d.total_ratings },
      { label: 'Missions complétées', accessor: d => d.total_missions_completed },
      { label: 'Candidatures', accessor: d => d.total_applications },
      { label: 'Acceptées', accessor: d => d.accepted_applications },
      { label: 'Bloqué', accessor: d => d.is_blocked ? 'Oui' : 'Non' },
      { label: 'Inscription', accessor: d => formatDate(d.created_at) },
      { label: 'Dernière connexion', accessor: d => formatDateTime(d.last_sign_in_at) },
      { label: 'Email confirmé', accessor: d => d.email_confirmed_at ? 'Oui' : 'Non' },
    ];

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px]">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Rechercher par email, nom, tél., ville, poste..." />
          </div>
          <button onClick={() => exportCSV(filtered, 'talents_extrataff', csvColumns)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            📥 Export CSV ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => handleBulkBlock('talents', true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
                🚫 Bloquer ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkBlock('talents', false)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                ✅ Débloquer ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkDelete('talents')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                🗑️ Supprimer ({selectedIds.size})
              </button>
            </>
          )}
          <span className="text-sm text-gray-500">{filtered.length} talent{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0}
                    onChange={() => toggleSelectAll(paged)} className="rounded" />
                </th>
                <SortableHeader label="📧 Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Prénom" field="first_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Nom" field="last_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="📱 Tél." field="phone" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Postes</th>
                <SortableHeader label="Ville" field="city" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="⭐" field="average_rating" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="📩" field="total_applications" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="✅" field="total_missions_completed" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Inscription" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Connexion" field="last_sign_in_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paged.map((t) => (
                <tr key={t.id} className={`hover:bg-blue-50 ${selectedIds.has(t.id) ? 'bg-blue-50' : ''} ${t.is_blocked ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2 text-sm font-medium text-blue-700 max-w-[200px] truncate">{t.email || '—'}</td>
                  <td className="px-3 py-2 text-sm">{t.first_name || '—'}</td>
                  <td className="px-3 py-2 text-sm font-medium">{t.last_name || '—'}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{t.phone || '—'}</td>
                  <td className="px-3 py-2 text-xs max-w-[150px]">
                    <div className="flex flex-wrap gap-1">
                      {(t.position_types || []).slice(0, 2).map((p, i) => (
                        <span key={i} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">{getPositionLabel(p)}</span>
                      ))}
                      {(t.position_types || []).length > 2 && (
                        <span className="text-gray-400 text-xs">+{t.position_types.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-sm">{t.city || '—'}</td>
                  <td className="px-3 py-2 text-sm">{t.average_rating > 0 ? `⭐ ${Number(t.average_rating).toFixed(1)}` : '—'}</td>
                  <td className="px-3 py-2 text-sm text-center">{t.total_applications || 0}</td>
                  <td className="px-3 py-2 text-sm text-center">{t.total_missions_completed || 0}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{formatDate(t.created_at)}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {t.last_sign_in_at ? timeAgo(t.last_sign_in_at) : <span className="text-red-400">Jamais</span>}
                  </td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      onClick={() => { setDetailItem(t); setDetailType('talent'); }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      👁️ Voir
                    </button>
                    <button
                      onClick={() => handleToggleBlock('talents', t.id, t.is_blocked, `${t.first_name} ${t.last_name}`)}
                      className={`text-xs font-medium ${t.is_blocked ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                    >
                      {t.is_blocked ? '✅ Débloquer' : '🚫 Bloquer'}
                    </button>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr><td colSpan="13" className="px-4 py-8 text-center text-gray-400">Aucun talent trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>
    );
  };

  // ============================================================
  // ONGLET : Établissements (avec emails)
  // ============================================================
  const renderEstablishments = () => {
    const searchFields = ['email', 'name', 'phone', 'city', 'department', 'address', 'type'];
    const filtered = filterData(establishments, searchFields);
    const sorted = sortData(filtered);
    const paged = paginate(sorted);

    const csvColumns = [
      { label: 'Email', accessor: d => d.email },
      { label: 'Établissement', accessor: d => d.name },
      { label: 'Type', accessor: d => d.type },
      { label: 'Téléphone', accessor: d => d.phone },
      { label: 'Adresse', accessor: d => d.address },
      { label: 'Ville', accessor: d => d.city },
      { label: 'Code postal', accessor: d => d.postal_code },
      { label: 'Département', accessor: d => d.department },
      { label: 'Statut abo', accessor: d => d.subscription_status },
      { label: 'Plan', accessor: d => d.subscription_plan },
      { label: 'Missions créées', accessor: d => d.missions_used },
      { label: 'Total missions', accessor: d => d.total_missions },
      { label: 'Missions actives', accessor: d => d.active_missions },
      { label: 'Candidatures reçues', accessor: d => d.total_applications_received },
      { label: 'Stripe Customer ID', accessor: d => d.stripe_customer_id },
      { label: 'Bloqué', accessor: d => d.is_blocked ? 'Oui' : 'Non' },
      { label: 'Inscription', accessor: d => formatDate(d.created_at) },
      { label: 'Dernière connexion', accessor: d => formatDateTime(d.last_sign_in_at) },
      { label: 'Email confirmé', accessor: d => d.email_confirmed_at ? 'Oui' : 'Non' },
    ];

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px]">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Rechercher par email, nom, ville, type..." />
          </div>
          <button onClick={() => exportCSV(filtered, 'etablissements_extrataff', csvColumns)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            📥 Export CSV ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => handleBulkBlock('establishments', true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm">
                🚫 Bloquer ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkBlock('establishments', false)} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm">
                ✅ Débloquer ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkDelete('establishments')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
                🗑️ Supprimer ({selectedIds.size})
              </button>
            </>
          )}
          <span className="text-sm text-gray-500">{filtered.length} établissement{filtered.length > 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0}
                    onChange={() => toggleSelectAll(paged)} className="rounded" />
                </th>
                <SortableHeader label="📧 Email" field="email" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Nom" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="📱 Tél." field="phone" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Ville" field="city" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Dép." field="department" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Abo</th>
                <SortableHeader label="📋 Missions" field="total_missions" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="📩 Cand." field="total_applications_received" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Inscription" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Connexion" field="last_sign_in_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paged.map((e) => {
                const badge = getSubscriptionBadge(e.subscription_status, e.subscription_plan);
                return (
                  <tr key={e.id} className={`hover:bg-blue-50 ${selectedIds.has(e.id) ? 'bg-blue-50' : ''} ${e.is_blocked ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedIds.has(e.id)} onChange={() => toggleSelect(e.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 text-sm font-medium text-blue-700 max-w-[200px] truncate">{e.email || '—'}</td>
                    <td className="px-3 py-2 text-sm font-medium">{e.name || '—'}</td>
                    <td className="px-3 py-2 text-sm text-gray-600">{e.phone || '—'}</td>
                    <td className="px-3 py-2 text-xs">{e.type || '—'}</td>
                    <td className="px-3 py-2 text-sm">{e.city || '—'}</td>
                    <td className="px-3 py-2 text-xs">{e.department || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>{badge.text}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center">{e.total_missions || 0}</td>
                    <td className="px-3 py-2 text-sm text-center">{e.total_applications_received || 0}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(e.created_at)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {e.last_sign_in_at ? timeAgo(e.last_sign_in_at) : <span className="text-red-400">Jamais</span>}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { setDetailItem(e); setDetailType('establishment'); }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          👁️ Voir
                        </button>
                        <button
                          onClick={() => handleToggleBlock('establishments', e.id, e.is_blocked, e.name)}
                          className={`text-xs font-medium ${e.is_blocked ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}`}
                        >
                          {e.is_blocked ? '✅ Débloquer' : '🚫 Bloquer'}
                        </button>
                        {e.subscription_plan !== 'club' && (
                          <>
                            <button
                              onClick={async () => {
                                if (!confirm(`Activer un abonnement MANUEL (sans paiement Stripe) pour ${e.name} ? Il aura les missions illimitées sans être facturé.`)) return;
                                await supabase.from('establishments').update({
                                  subscription_status: 'active',
                                  subscription_plan: 'club',
                                  subscription_started_at: new Date().toISOString(),
                                }).eq('id', e.id);
                                loadData();
                              }}
                              className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                            >
                              🏆 Abonnement manuel
                            </button>
                            <button
                              onClick={() => handleGrantMission(e.id, e.name)}
                              className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                            >
                              🎁 Offrir 1 mission
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan="13" className="px-4 py-8 text-center text-gray-400">Aucun établissement trouvé</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>
    );
  };

  // ============================================================
  // ONGLET : Missions
  // ============================================================
  const renderMissions = () => {
    const searchFields = ['position', 'location_fuzzy', 'status', 'description'];
    const filtered = filterData(missions, searchFields);
    const sorted = sortData(filtered);
    const paged = paginate(sorted);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px]">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Rechercher par poste, lieu, statut..." />
          </div>
          <button onClick={() => exportCSV(filtered, 'missions_extrataff', [
            { label: 'Établissement', accessor: d => d.establishments?.name },
            { label: 'Poste', accessor: d => getPositionLabel(d.position) },
            { label: 'Statut', accessor: d => d.status },
            { label: 'Début', accessor: d => formatDate(d.start_date) },
            { label: 'Fin', accessor: d => formatDate(d.end_date) },
            { label: 'Localisation', accessor: d => d.location_fuzzy },
            { label: 'Urgence', accessor: d => d.urgency_level },
            { label: 'Créée le', accessor: d => formatDate(d.created_at) },
          ])} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            📥 Export CSV ({filtered.length})
          </button>
          {selectedIds.size > 0 && (
            <button onClick={() => handleBulkDelete('missions')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              🗑️ Supprimer ({selectedIds.size})
            </button>
          )}
          <span className="text-sm text-gray-500">{filtered.length} mission{filtered.length > 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0}
                    onChange={() => toggleSelectAll(paged)} className="rounded" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                <SortableHeader label="Poste" field="position" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Statut" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Début" field="start_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Fin" field="end_date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lieu</th>
                <SortableHeader label="Urgence" field="urgency_level" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Créée" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paged.map((m) => {
                const statusColors = {
                  open: 'bg-green-100 text-green-800',
                  closed: 'bg-gray-100 text-gray-600',
                  filled: 'bg-blue-100 text-blue-800',
                  cancelled: 'bg-red-100 text-red-800',
                  pending: 'bg-yellow-100 text-yellow-800',
                  active: 'bg-purple-100 text-purple-800',
                };
                return (
                  <tr key={m.id} className={`hover:bg-blue-50 ${selectedIds.has(m.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelect(m.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 text-sm">{m.establishments?.name || '—'}</td>
                    <td className="px-3 py-2 text-sm font-medium">{getPositionLabel(m.position)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[m.status] || 'bg-gray-100'}`}>{m.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">{formatDate(m.start_date)}</td>
                    <td className="px-3 py-2 text-xs">{formatDate(m.end_date)}</td>
                    <td className="px-3 py-2 text-sm">{m.location_fuzzy || '—'}</td>
                    <td className="px-3 py-2">
                      {m.urgency_level === 'urgent' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">🔴 Urgent</span>
                      ) : (
                        <span className="text-xs text-gray-500">Normal</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(m.created_at)}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan="9" className="px-4 py-8 text-center text-gray-400">Aucune mission trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>
    );
  };

  // ============================================================
  // ONGLET : Candidatures
  // ============================================================
  const renderApplications = () => {
    const filtered = applications.filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      const talentName = `${a.talents?.first_name || ''} ${a.talents?.last_name || ''}`.toLowerCase();
      const estName = a.missions?.establishments?.name?.toLowerCase() || '';
      const position = a.missions?.position?.toLowerCase() || '';
      const status = a.status?.toLowerCase() || '';
      return talentName.includes(q) || estName.includes(q) || position.includes(q) || status.includes(q);
    });
    const sorted = sortData(filtered);
    const paged = paginate(sorted);

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[250px]">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setCurrentPage(1); }} placeholder="Rechercher par talent, établissement, poste, statut..." />
          </div>
          {selectedIds.size > 0 && (
            <button onClick={() => handleBulkDelete('applications')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              🗑️ Supprimer ({selectedIds.size})
            </button>
          )}
          <span className="text-sm text-gray-500">{filtered.length} candidature{filtered.length > 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox" checked={selectedIds.size === paged.length && paged.length > 0}
                    onChange={() => toggleSelectAll(paged)} className="rounded" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talent</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <SortableHeader label="Statut" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paged.map((a) => {
                const statusColors = {
                  interested: 'bg-blue-100 text-blue-800',
                  pending: 'bg-yellow-100 text-yellow-800',
                  accepted: 'bg-green-100 text-green-800',
                  confirmed: 'bg-emerald-100 text-emerald-800',
                  rejected: 'bg-red-100 text-red-800',
                };
                return (
                  <tr key={a.id} className={`hover:bg-blue-50 ${selectedIds.has(a.id) ? 'bg-blue-50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedIds.has(a.id)} onChange={() => toggleSelect(a.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 text-sm">{a.talents?.first_name} {a.talents?.last_name}</td>
                    <td className="px-3 py-2 text-sm">{a.missions?.establishments?.name || '—'}</td>
                    <td className="px-3 py-2 text-sm">{getPositionLabel(a.missions?.position)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status] || 'bg-gray-100'}`}>{a.status}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(a.created_at)}</td>
                  </tr>
                );
              })}
              {paged.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Aucune candidature trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
      </div>
    );
  };

  // ============================================================
  // ONGLET : Abonnements et ventes (grille tarifaire actuelle)
  // ============================================================
  const renderSubscriptions = () => {
    const abonnes = establishments.filter(e => e.subscription_status === 'active' && ['club', 'annual'].includes(e.subscription_plan));
    const pay = pilotage?.paiements;

    return (
      <div className="space-y-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-900">
          <strong>Grille tarifaire :</strong> mission à l'unité <strong>19,90 €</strong> · pack de 3 missions <strong>34,90 €</strong> (valable 2 mois) ·
          abonnement <strong>14,90 €/mois</strong> jusqu'au 31/12/2026 puis <strong>19,90 €/mois</strong>, engagement de 12 mois ·
          première mission <strong>offerte</strong> pour toute inscription avant le 1er décembre 2026.
        </div>

        {!pay && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            Les chiffres de ventes ne sont pas disponibles{pilotageError ? ` (${pilotageError})` : ''} : vérifier que « 21-admin-pilotage.sql » a été exécuté.
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi icon="🏆" label="Abonnés actifs" value={pay ? pay.abonnes_actifs : abonnes.length} hint={pay ? `+ ${pay.abonnes_annuels_actifs} annuel(s)` : undefined} tone="amber" />
          <Kpi icon="💰" label="Revenu mensuel des abonnements" value={pay ? eur(pay.abonnements_revenu_mensuel_estime) : '—'} tone="green" hint="estimé aux tarifs de la grille" />
          <Kpi icon="📦" label="Packs vendus" value={pay ? pay.packs_vendus : '—'} hint={pay ? `${pay.credits_de_pack_vendus} crédits` : undefined} />
          <Kpi icon="💶" label="Missions payées à l'unité" value={pay ? pay.missions_payees_a_l_unite : '—'} />
        </div>

        <div className="p-4 bg-gray-50 border rounded-xl text-sm text-gray-600">
          Les montants réellement encaissés sont dans Stripe. Ici, les ventes sont comptées et estimées au tarif actuel : les anciens paiements
          (offre de juin à août) avaient d'autres prix. Pour <strong>offrir une mission</strong> ou activer un <strong>abonnement manuel</strong>
          (sans Stripe) à un établissement, utiliser les boutons de l'onglet « Établissements ».
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">🏆 Abonnés actifs</h3>
          {abonnes.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aucun abonné pour le moment</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📧 Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📱 Tél.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Formule</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {abonnes.map((e) => (
                    <tr key={e.id} className="hover:bg-yellow-50">
                      <td className="px-3 py-2 text-sm font-medium text-blue-700">{e.email}</td>
                      <td className="px-3 py-2 text-sm font-medium">{e.name}</td>
                      <td className="px-3 py-2 text-sm">{e.phone || '—'}</td>
                      <td className="px-3 py-2 text-sm">{e.city || '—'}</td>
                      <td className="px-3 py-2 text-sm">{e.subscription_plan === 'annual' ? 'Annuel' : 'Mensuel'}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(e.subscription_started_at)}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 font-mono">{e.stripe_subscription_id ? 'Stripe' : '⚠️ manuel'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-3">🎁 Ont encore leur mission offerte à utiliser</h3>
          <MiniTable
            columns={[
              { label: 'Établissement', render: (r) => <div><div className="font-medium">{r.nom}</div><div className="text-xs text-gray-400">{r.ville || '—'}</div></div> },
              { label: 'Contact', render: (r) => <div className="text-xs leading-5"><div className="font-medium">{r.telephone ? `📱 ${r.telephone}` : '📱 —'}</div><div className="text-blue-700">{r.email || '—'}</div></div> },
              { label: 'Inscrit', render: (r) => formatDate(r.inscrit_le) },
              { label: 'Action', render: (r) => (
                <button
                  onClick={() => handleGrantMission(r.id, r.nom)}
                  className="text-xs px-3 py-1 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  🎁 Offrir 1 mission de plus
                </button>
              ) },
            ]}
            rows={pilotage?.offre?.eligibles_liste}
            empty="Tous les inscrits ont utilisé leur offre"
          />
        </div>
      </div>
    );
  };

  // ============================================================
  // ONGLET : Admins
  // ============================================================
  const handleInviteAdmin = async () => {
  if (!inviteEmail || !inviteName) {
    alert('Email et nom requis');
    return;
  }
  setInviting(true);
  try {
    // 1. Générer un token unique
    const activationToken = crypto.randomUUID();

    // 2. Récupérer l'email de l'admin connecté
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Insérer dans la table admins
    const { error: insertError } = await supabase
      .from('admins')
      .insert({
        email: inviteEmail.toLowerCase().trim(),
        name: inviteName.trim(),
        activation_token: activationToken,
        is_activated: false,
        created_by: user?.email || 'admin'
      });

    if (insertError) {
      if (insertError.message.includes('duplicate') || insertError.message.includes('unique')) {
        alert('Cet email est déjà dans la liste des admins.');
        return;
      }
      throw insertError;
    }

    // 4. Envoyer l'email d'invitation avec le token
    const { error } = await supabase.functions.invoke('send-admin-invite', {
      body: { email: inviteEmail, name: inviteName, activationToken }
    });

    if (error) throw error;

    alert(`Invitation envoyée à ${inviteEmail}`);
    setInviteEmail('');
    setInviteName('');
    loadData();
  } catch (err) {
    console.error('Erreur invitation:', err);
    alert('Erreur: ' + (err.message || "Échec de l'envoi"));
  } finally {
    setInviting(false);
  }
};

  // ============================================================
  // ONGLET : RDV
  // ============================================================
  const renderRdv = () => {
    const getRdvBadge = (status) => {
      if (status === 'pending') return { text: '⏳ En attente', color: 'bg-amber-100 text-amber-800' };
      if (status === 'confirmed') return { text: '✅ Confirmé', color: 'bg-green-100 text-green-800' };
      if (status === 'refused') return { text: '❌ Refusé', color: 'bg-red-100 text-red-800' };
      if (status === 'done') return { text: '✅ Effectué', color: 'bg-blue-100 text-blue-800' };
      return { text: status, color: 'bg-gray-100 text-gray-600' };
    };

    const filtered = appointments.filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      const talent = a.applications?.talents;
      const mission = a.applications?.missions;
      return (
        (talent?.first_name || '').toLowerCase().includes(q) ||
        (talent?.last_name || '').toLowerCase().includes(q) ||
        (mission?.establishments?.name || '').toLowerCase().includes(q) ||
        (mission?.position || '').toLowerCase().includes(q) ||
        (a.status || '').toLowerCase().includes(q)
      );
    });

    const pending = appointments.filter(a => a.status === 'pending').length;
    const confirmed = appointments.filter(a => a.status === 'confirmed').length;
    const refused = appointments.filter(a => a.status === 'refused').length;
    const done = appointments.filter(a => a.status === 'done').length;

    return (
      <div className="space-y-6">
        {/* Stats RDV */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'En attente', value: pending, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Confirmés', value: confirmed, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Refusés', value: refused, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Effectués', value: done, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-xl border p-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Barre de recherche + export */}
        <div className="flex gap-3 items-center">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par talent, établissement..." /></div>
          <button
            onClick={() => exportCSV(filtered, 'rdv', [
              { label: 'Date RDV', accessor: r => r.scheduled_at ? new Date(r.scheduled_at).toLocaleString('fr-FR') : '—' },
              { label: 'Talent', accessor: r => `${r.applications?.talents?.first_name || ''} ${r.applications?.talents?.last_name || ''}` },
              { label: 'Établissement', accessor: r => r.applications?.missions?.establishments?.name || '—' },
              { label: 'Poste', accessor: r => getPositionLabel(r.applications?.missions?.position) },
              { label: 'Adresse', accessor: r => r.address || '—' },
              { label: 'Statut', accessor: r => r.status },
              { label: 'Note', accessor: r => r.note || '' },
              { label: 'Créé le', accessor: r => formatDateTime(r.created_at) },
            ])}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >📥 Export CSV</button>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date RDV</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Note</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginate(filtered).map(a => {
                const badge = getRdvBadge(a.status);
                const talent = a.applications?.talents;
                const mission = a.applications?.missions;
                return (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {a.scheduled_at ? new Date(a.scheduled_at).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {talent ? `${talent.first_name} ${talent.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{mission?.establishments?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getPositionLabel(mission?.position)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{a.address || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.color}`}>{badge.text}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 italic max-w-xs truncate">{a.note || '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Aucun rendez-vous</td></tr>
              )}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>
    );
  };

  // ============================================================
  // ONGLET : Embauches
  // ============================================================
  const renderHires = () => {
    const filtered = hires.filter(h => {
      if (!search) return true;
      const q = search.toLowerCase();
      const talent = h.talents;
      const mission = h.missions;
      return (
        (talent?.first_name || '').toLowerCase().includes(q) ||
        (talent?.last_name || '').toLowerCase().includes(q) ||
        (mission?.establishments?.name || '').toLowerCase().includes(q) ||
        (mission?.position || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="space-y-6">
        {/* Stats embauches */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-xl border p-4">
            <div className="text-2xl font-bold text-green-600">{hires.length}</div>
            <div className="text-sm text-gray-500">Total embauches confirmées</div>
          </div>
          <div className="bg-blue-50 rounded-xl border p-4">
            <div className="text-2xl font-bold text-blue-600">
              {hires.filter(h => {
                const d = new Date(h.confirmed_at);
                const now = new Date();
                return now - d < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </div>
            <div className="text-sm text-gray-500">Embauches cette semaine</div>
          </div>
          <div className="bg-purple-50 rounded-xl border p-4">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(hires.length / Math.max(pilotage?.funnel?.ont_publie || 1, 1) * 10) / 10}
            </div>
            <div className="text-sm text-gray-500">Embauches / établissement ayant publié</div>
          </div>
        </div>

        {/* Barre de recherche + export */}
        <div className="flex gap-3 items-center">
          <div className="flex-1"><SearchBar value={search} onChange={setSearch} placeholder="Rechercher par talent, établissement..." /></div>
          <button
            onClick={() => exportCSV(filtered, 'embauches', [
              { label: 'Talent', accessor: h => `${h.talents?.first_name || ''} ${h.talents?.last_name || ''}` },
              { label: 'Établissement', accessor: h => h.missions?.establishments?.name || '—' },
              { label: 'Poste', accessor: h => getPositionLabel(h.missions?.position) },
              { label: 'Date mission', accessor: h => formatDate(h.missions?.start_date) },
              { label: 'Date confirmation', accessor: h => formatDateTime(h.confirmed_at) },
              { label: 'Candidature créée', accessor: h => formatDateTime(h.created_at) },
            ])}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >📥 Export CSV</button>
        </div>

        {/* Tableau */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Poste</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date mission</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmé le</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Délai</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginate(filtered).map(h => {
                const delai = h.confirmed_at && h.created_at
                  ? Math.round((new Date(h.confirmed_at) - new Date(h.created_at)) / (1000 * 60 * 60 * 24))
                  : null;
                return (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {h.talents ? `${h.talents.first_name} ${h.talents.last_name}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{h.missions?.establishments?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{getPositionLabel(h.missions?.position)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(h.missions?.start_date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDateTime(h.confirmed_at)}</td>
                    <td className="px-4 py-3">
                      {delai !== null ? (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${delai <= 2 ? 'bg-green-100 text-green-800' : delai <= 7 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                          {delai}j
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-400">Aucune embauche confirmée</td></tr>
              )}
            </tbody>
          </table>
          <Pagination currentPage={currentPage} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      </div>
    );
  };

  const renderAdmins = () => {
    return (
      <div className="space-y-6">
        {/* Formulaire d'invitation */}
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">📨 Inviter un nouvel admin</h3>
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Nom de l'admin"
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email de l'admin"
              className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleInviteAdmin}
              disabled={inviting || !inviteEmail || !inviteName}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
            >
              {inviting ? 'Envoi...' : '📨 Envoyer l\'invitation'}
            </button>
          </div>
        </div>

        {/* Liste des admins */}
        <div className="overflow-x-auto rounded-xl border shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invité par</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date invitation</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activé le</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{a.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-blue-700">{a.email}</td>
                  <td className="px-4 py-3">
                    {a.is_activated ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">✅ Actif</span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">⏳ En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{a.created_by || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatDate(a.activated_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={async () => {
                        if (!confirm(`Supprimer l'admin ${a.email} ?`)) return;
                        const { error } = await supabase.from('admins').delete().eq('id', a.id);
                        if (error) {
                          alert('Erreur: ' + error.message);
                        } else {
                          loadData();
                        }
                      }}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >🗑️ Supprimer</button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">Aucun admin</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================
  // RENDU PRINCIPAL
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du dashboard admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚡ ExtraTaff Admin</h1>
              <p className="text-sm text-gray-500">Base de données complète — {talents.length} talents · {establishments.length} établissements</p>
            </div>
            <div className="flex gap-3">
              <button onClick={loadData} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                🔄 Rafraîchir
              </button>
              <button onClick={() => navigate('/')} className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'funnel' && (
          <AdminFunnel
            missions={missions}
            applications={applications}
            appointments={appointments}
            hires={hires}
            onReload={loadData}
          />
        )}
        {activeTab === 'talents' && renderTalents()}
        {activeTab === 'establishments' && renderEstablishments()}
        {activeTab === 'missions' && renderMissions()}
        {activeTab === 'applications' && renderApplications()}
        {activeTab === 'rdv' && renderRdv()}
        {activeTab === 'hires' && renderHires()}
        {activeTab === 'subscriptions' && renderSubscriptions()}
        {activeTab === 'admins' && renderAdmins()}
      </div>

      {/* Modal détail */}
      {detailItem && detailType === 'talent' && (
        <TalentDetailModal item={detailItem} onClose={() => { setDetailItem(null); setDetailType(null); }} />
      )}
      {detailItem && detailType === 'establishment' && (
        <EstablishmentDetailModal item={detailItem} onClose={() => { setDetailItem(null); setDetailType(null); }} />
      )}
    </div>
  );
}
