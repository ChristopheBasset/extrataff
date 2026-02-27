import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// ============================================================
// ADMIN DASHBOARD — Vue complète avec emails
// Adapté au schéma réel de la BDD ExtraTaff
// ============================================================

const TABS_BASE = [
  { id: 'overview', label: '📊 Vue d\'ensemble' },
  { id: 'talents', label: '👤 Talents' },
  { id: 'establishments', label: '🏪 Établissements' },
  { id: 'missions', label: '📋 Missions' },
  { id: 'applications', label: '📩 Candidatures' },
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
  if (plan === 'club') return { text: '🏆 Club', color: 'bg-yellow-100 text-yellow-800' };
  if (status === 'active') return { text: '✅ Actif', color: 'bg-green-100 text-green-800' };
  return { text: '🆓 Freemium', color: 'bg-gray-100 text-gray-600' };
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
    { label: '💳 Statut abo', value: item.subscription_status || 'freemium' },
    { label: '💳 Plan', value: item.subscription_plan || '—' },
    { label: 'Stripe Customer', value: item.stripe_customer_id },
    { label: 'Stripe Subscription', value: item.stripe_subscription_id },
    { label: 'Début abo', value: formatDate(item.subscription_started_at) },
    { label: 'Fin abo', value: formatDate(item.subscription_ends_at) },
    { label: 'Fin essai', value: formatDate(item.trial_ends_at) },
    { label: 'Missions créées', value: item.missions_used },
    { label: 'Crédits missions', value: item.missions_credit },
    { label: 'Mission incluse', value: item.missions_included_used ? 'Utilisée' : 'Disponible' },
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

  // UI state
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [detailItem, setDetailItem] = useState(null);
  const [detailType, setDetailType] = useState(null);

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

      // Charger candidatures
      const { data: appsData } = await supabase
        .from('applications')
        .select('*, talents(first_name, last_name), missions(position, establishments(name))')
        .order('created_at', { ascending: false });
      setApplications(appsData || []);

      // Stats globales via RPC
      const { data: statsData, error: statsErr } = await supabase.rpc('get_admin_stats');
      if (!statsErr && statsData) {
        setStats(statsData);
      }

      // Charger admins
      const { data: adminsData } = await supabase
        .from('admins')
        .select('*')
        .order('created_at', { ascending: false });
      setAdmins(adminsData || []);
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

  // ============================================================
  // ONGLET : Vue d'ensemble
  // ============================================================
  const renderOverview = () => {
    if (!stats) return <div className="text-center py-12 text-gray-500">Chargement des statistiques...</div>;

    const cards = [
      { label: 'Talents inscrits', value: stats.total_talents, icon: '👤', color: 'blue' },
      { label: 'Établissements', value: stats.total_establishments, icon: '🏪', color: 'green' },
      { label: 'Missions créées', value: stats.total_missions, icon: '📋', color: 'purple' },
      { label: 'Missions actives', value: stats.active_missions, icon: '🔥', color: 'orange' },
      { label: 'Candidatures', value: stats.total_applications, icon: '📩', color: 'pink' },
      { label: 'Messages', value: stats.total_messages, icon: '💬', color: 'indigo' },
      { label: 'Abonnés Club', value: stats.club_subscribers, icon: '🏆', color: 'yellow' },
      { label: 'Revenu mensuel estimé', value: `${stats.estimated_monthly_revenue}€`, icon: '💰', color: 'emerald' },
    ];

    const activityCards = [
      { label: 'Nouveaux talents (7j)', value: stats.new_talents_week, icon: '🆕' },
      { label: 'Nouveaux établissements (7j)', value: stats.new_establishments_week, icon: '🆕' },
      { label: 'Talents actifs (7j)', value: stats.active_talents_week, icon: '🟢' },
      { label: 'Établissements actifs (7j)', value: stats.active_establishments_week, icon: '🟢' },
      { label: 'Emails non confirmés (talents)', value: stats.unconfirmed_talents, icon: '⚠️' },
      { label: 'Emails non confirmés (établ.)', value: stats.unconfirmed_establishments, icon: '⚠️' },
      { label: 'Talents bloqués', value: stats.blocked_talents, icon: '🚫' },
      { label: 'Établissements bloqués', value: stats.blocked_establishments, icon: '🚫' },
    ];

    return (
      <div className="space-y-8">
        {/* Stats principales */}
        <div>
          <h3 className="text-lg font-semibold mb-4">📊 Statistiques globales</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {cards.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                <div className="text-sm text-gray-500">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activité récente */}
        <div>
          <h3 className="text-lg font-semibold mb-4">📈 Activité récente</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activityCards.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span>{c.icon}</span>
                  <span className="text-xl font-bold">{c.value}</span>
                </div>
                <div className="text-sm text-gray-500">{c.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel de conversion */}
        <div>
          <h3 className="text-lg font-semibold mb-4">🔄 Funnel Établissements</h3>
          <div className="bg-white rounded-xl border p-6 shadow-sm space-y-3">
            {[
              { label: '1. Inscrits', value: stats.total_establishments, width: '100%' },
              { label: '2. Freemium actifs', value: stats.freemium_users, width: `${stats.total_establishments ? Math.round(stats.freemium_users / stats.total_establishments * 100) : 0}%` },
              { label: '3. Mission gratuite épuisée', value: establishments.filter(e => e.missions_used >= 1 && e.subscription_plan !== 'club').length, width: `${stats.total_establishments ? Math.round(establishments.filter(e => e.missions_used >= 1 && e.subscription_plan !== 'club').length / stats.total_establishments * 100) : 0}%` },
              { label: '4. 🏆 Club ExtraTaff', value: stats.club_subscribers, width: `${stats.total_establishments ? Math.round(stats.club_subscribers / stats.total_establishments * 100) : 0}%` },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-sm w-52 shrink-0">{step.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6">
                  <div className="bg-blue-500 rounded-full h-6 flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                    style={{ width: step.width, minWidth: step.value > 0 ? '40px' : '0' }}>
                    {step.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
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
            <button onClick={() => handleBulkDelete('talents')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              🗑️ Supprimer ({selectedIds.size})
            </button>
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
                  <td className="px-3 py-2">
                    <button
                      onClick={() => { setDetailItem(t); setDetailType('talent'); }}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      👁️ Voir
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
      { label: 'Crédits missions', accessor: d => d.missions_credit },
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
            <button onClick={() => handleBulkDelete('establishments')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              🗑️ Supprimer ({selectedIds.size})
            </button>
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
                    <td className="px-3 py-2 flex gap-2">
                      <button
                        onClick={() => { setDetailItem(e); setDetailType('establishment'); }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        👁️ Voir
                      </button>
                      {e.subscription_plan !== 'club' && (
                        <button
                          onClick={async () => {
                            if (!confirm(`Activer Club ExtraTaff pour ${e.name} ?`)) return;
                            await supabase.from('establishments').update({
                              subscription_status: 'active',
                              subscription_plan: 'club',
                              missions_included_used: false,
                              subscription_started_at: new Date().toISOString(),
                            }).eq('id', e.id);
                            loadData();
                          }}
                          className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                        >
                          🏆 Club
                        </button>
                      )}
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
                  pending: 'bg-yellow-100 text-yellow-800',
                  accepted: 'bg-green-100 text-green-800',
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
  // ONGLET : Abonnements
  // ============================================================
  const renderSubscriptions = () => {
    const clubMembers = establishments.filter(e => e.subscription_plan === 'club');
    const freemiumUsed = establishments.filter(e => e.subscription_plan !== 'club' && e.missions_used >= 1);

    return (
      <div className="space-y-6">
        {/* Stats abonnements */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-yellow-800">{clubMembers.length}</div>
            <div className="text-sm text-yellow-600">🏆 Membres Club</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-800">{clubMembers.length * 24}€</div>
            <div className="text-sm text-green-600">💰 Revenu mensuel</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-orange-800">{freemiumUsed.length}</div>
            <div className="text-sm text-orange-600">🎯 Prospects chauds</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-gray-800">{establishments.length - clubMembers.length}</div>
            <div className="text-sm text-gray-600">🆓 Freemium</div>
          </div>
        </div>

        {/* Membres Club */}
        <div>
          <h3 className="text-lg font-semibold mb-3">🏆 Membres Club ExtraTaff</h3>
          {clubMembers.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aucun membre Club pour le moment</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📧 Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📱 Tél.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mission incluse</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Début abo</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe ID</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clubMembers.map((e) => (
                    <tr key={e.id} className="hover:bg-yellow-50">
                      <td className="px-3 py-2 text-sm font-medium text-blue-700">{e.email}</td>
                      <td className="px-3 py-2 text-sm font-medium">{e.name}</td>
                      <td className="px-3 py-2 text-sm">{e.phone || '—'}</td>
                      <td className="px-3 py-2 text-sm">{e.city || '—'}</td>
                      <td className="px-3 py-2 text-sm">
                        {e.missions_included_used ? (
                          <span className="text-orange-600">Utilisée</span>
                        ) : (
                          <span className="text-green-600">✅ Disponible</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs">{formatDate(e.subscription_started_at)}</td>
                      <td className="px-3 py-2 text-xs text-gray-400 font-mono">{e.stripe_customer_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Prospects chauds */}
        <div>
          <h3 className="text-lg font-semibold mb-3">🎯 Prospects chauds (≥1 mission, pas Club)</h3>
          {freemiumUsed.length === 0 ? (
            <p className="text-gray-400 text-center py-4">Aucun prospect chaud</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📧 Email</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Établissement</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">📱 Tél.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Missions</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inscription</th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {freemiumUsed.map((e) => (
                    <tr key={e.id} className="hover:bg-orange-50">
                      <td className="px-3 py-2 text-sm font-medium text-blue-700">{e.email}</td>
                      <td className="px-3 py-2 text-sm font-medium">{e.name}</td>
                      <td className="px-3 py-2 text-sm">{e.phone || '—'}</td>
                      <td className="px-3 py-2 text-sm">{e.city || '—'}</td>
                      <td className="px-3 py-2 text-sm">{e.missions_used}</td>
                      <td className="px-3 py-2 text-xs">{formatDate(e.created_at)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={async () => {
                            if (!confirm(`Activer Club ExtraTaff pour ${e.name} ?`)) return;
                            await supabase.from('establishments').update({
                              subscription_status: 'active',
                              subscription_plan: 'club',
                              missions_included_used: false,
                              subscription_started_at: new Date().toISOString(),
                            }).eq('id', e.id);
                            loadData();
                          }}
                          className="text-xs px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                        >
                          🏆 Activer Club
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
      const { error } = await supabase.functions.invoke('send-admin-invite', {
        body: { email: inviteEmail, name: inviteName }
      });
      if (error) throw error;
      alert(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      setInviteName('');
      loadData();
    } catch (err) {
      console.error('Erreur invitation:', err);
      alert('Erreur: ' + (err.message || 'Échec de l\'envoi'));
    } finally {
      setInviting(false);
    }
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
        {activeTab === 'talents' && renderTalents()}
        {activeTab === 'establishments' && renderEstablishments()}
        {activeTab === 'missions' && renderMissions()}
        {activeTab === 'applications' && renderApplications()}
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
