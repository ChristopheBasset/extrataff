import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';

// ============================================================
// AdminFunnel — Vue funnel + alertes + activité récente
// Props : missions, applications, appointments, hires (déjà chargés par AdminDashboard)
// ============================================================

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
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days}j`;
  return `il y a ${Math.floor(days / 30)} mois`;
};

const POSITION_LABELS = {
  barman: 'Barman/Barmaid', serveur: 'Serveur/Serveuse', runner: 'Runner',
  chef: 'Chef', sous_chef: 'Sous-chef', chef_de_partie: 'Chef de partie',
  chef_de_salle: 'Chef de salle', plongeur: 'Plongeur', commis: 'Commis'
};
const positionLabel = (key) => POSITION_LABELS[key] || key || '—';

// ============================================================
// Composant : MetricCard
// ============================================================
const MetricCard = ({ icon, label, value, sublabel, color = 'blue' }) => {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
          {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white text-lg shadow-sm`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Helpers — calcul d'alertes par mission
// ============================================================
const computeMissionAlert = (mission, missionApps, messageCountByMission) => {
  const now = Date.now();
  const createdAt = new Date(mission.created_at).getTime();
  const ageHours = (now - createdAt) / 3_600_000;
  const ageDays = ageHours / 24;

  const candidatures = missionApps.length;
  const accepted = missionApps.filter(a => a.status === 'accepted').length;
  const hired = missionApps.filter(a => a.hire_status === 'hired').length;
  const messagesCount = messageCountByMission[mission.id] || 0;

  // 🚨 Stagnante : >10 candidatures, 0 acceptation, depuis 48h+
  if (candidatures >= 10 && accepted === 0 && ageHours >= 48) {
    return { level: 'critical', icon: '🚨', label: 'Stagnante', reason: `${candidatures} candidatures, aucune acceptée depuis ${Math.floor(ageDays)}j` };
  }
  // ⏳ Pas validée : chat actif (acceptations + messages) mais pas d'embauche après 5j
  if (accepted > 0 && messagesCount >= 3 && hired === 0 && ageDays >= 5) {
    return { level: 'warning', icon: '⏳', label: 'Pas validée', reason: `Chat actif (${messagesCount} msg) mais aucune embauche` };
  }
  // ⚠️ À risque : acceptée mais 0 message après 24h
  if (accepted > 0 && messagesCount === 0 && ageHours >= 24) {
    return { level: 'warning', icon: '⚠️', label: 'À risque', reason: `Candidatures acceptées, aucun message échangé` };
  }
  // 🟢 OK
  if (hired > 0) {
    return { level: 'success', icon: '✅', label: 'Embauchée', reason: 'Mission validée' };
  }
  return { level: 'ok', icon: '🟢', label: 'En cours', reason: '' };
};

// ============================================================
// Composant principal
// ============================================================
export default function AdminFunnel({ missions = [], applications = [], appointments = [], hires = [], onReload }) {
  const [scope, setScope] = useState('all'); // 'all', 'active', '30d'
  const [messageCountByMission, setMessageCountByMission] = useState({});
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [contactingId, setContactingId] = useState(null);

  // Charger le compte de messages par mission (sans charger tout le contenu)
  useEffect(() => {
    const loadMessageCounts = async () => {
      setLoadingMessages(true);
      try {
        const { data } = await supabase.from('messages').select('mission_id');
        const counts = {};
        (data || []).forEach(m => {
          if (m.mission_id) counts[m.mission_id] = (counts[m.mission_id] || 0) + 1;
        });
        setMessageCountByMission(counts);
      } catch (err) {
        console.error('Erreur chargement messages funnel:', err);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessageCounts();
  }, []);

  // Filtrage selon le scope
  const filteredMissions = useMemo(() => {
    if (scope === 'active') {
      return missions.filter(m => ['open', 'active', 'filled'].includes(m.status));
    }
    if (scope === '30d') {
      const cutoff = Date.now() - 30 * 24 * 3_600_000;
      return missions.filter(m => new Date(m.created_at).getTime() >= cutoff);
    }
    return missions;
  }, [missions, scope]);

  // Index applications par mission_id
  const appsByMission = useMemo(() => {
    const map = {};
    applications.forEach(a => {
      if (!map[a.mission_id]) map[a.mission_id] = [];
      map[a.mission_id].push(a);
    });
    return map;
  }, [applications]);

  // Enrichir les missions avec leur funnel
  const missionsWithFunnel = useMemo(() => {
    return filteredMissions.map(m => {
      const missionApps = appsByMission[m.id] || [];
      const candidatures = missionApps.length;
      const accepted = missionApps.filter(a => a.status === 'accepted').length;
      const messagesCount = messageCountByMission[m.id] || 0;
      const hired = missionApps.filter(a => a.hire_status === 'hired').length;
      const alert = computeMissionAlert(m, missionApps, messageCountByMission);
      return { ...m, _funnel: { candidatures, accepted, messagesCount, hired, alert } };
    });
  }, [filteredMissions, appsByMission, messageCountByMission]);

  // Métriques globales
  const metrics = useMemo(() => {
    const scopeApps = applications.filter(a =>
      missionsWithFunnel.some(m => m.id === a.mission_id)
    );
    const totalCandidatures = scopeApps.length;
    const totalAccepted = scopeApps.filter(a => a.status === 'accepted').length;
    const totalHired = scopeApps.filter(a => a.hire_status === 'hired').length;

    const tauxAcceptation = totalCandidatures > 0
      ? Math.round((totalAccepted / totalCandidatures) * 100)
      : 0;
    const tauxEmbauche = totalAccepted > 0
      ? Math.round((totalHired / totalAccepted) * 100)
      : 0;

    // Délai moyen acceptation → embauche
    const hiredApps = scopeApps.filter(a => a.hire_status === 'hired' && a.confirmed_at && a.updated_at);
    let avgDelay = '—';
    if (hiredApps.length > 0) {
      const totalMs = hiredApps.reduce((sum, a) => {
        return sum + (new Date(a.confirmed_at).getTime() - new Date(a.updated_at).getTime());
      }, 0);
      const avgHours = (totalMs / hiredApps.length) / 3_600_000;
      if (avgHours < 24) avgDelay = `${Math.round(avgHours)}h`;
      else avgDelay = `${Math.round(avgHours / 24)}j`;
    }

    return { totalCandidatures, totalAccepted, totalHired, tauxAcceptation, tauxEmbauche, avgDelay };
  }, [applications, missionsWithFunnel]);

  // Alertes triées (critiques en premier, puis warnings, puis OK)
  const sortedMissions = useMemo(() => {
    const order = { critical: 0, warning: 1, success: 2, ok: 3 };
    return [...missionsWithFunnel].sort((a, b) => {
      const oa = order[a._funnel.alert.level] ?? 99;
      const ob = order[b._funnel.alert.level] ?? 99;
      if (oa !== ob) return oa - ob;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [missionsWithFunnel]);

  // Flux d'activité récente
  const recentActivity = useMemo(() => {
    const events = [];
    applications.forEach(a => {
      events.push({
        type: 'application', icon: '📩', timestamp: a.created_at,
        text: `${a.talents?.first_name || 'Un talent'} a postulé sur "${positionLabel(a.missions?.position)}" chez ${a.missions?.establishments?.name || '?'}`,
      });
      if (a.status === 'accepted' && a.updated_at && a.updated_at !== a.created_at) {
        events.push({
          type: 'accept', icon: '✅', timestamp: a.updated_at,
          text: `${a.missions?.establishments?.name || '?'} a accepté ${a.talents?.first_name || 'un talent'} pour "${positionLabel(a.missions?.position)}"`,
        });
      }
      if (a.hire_status === 'hired' && a.confirmed_at) {
        events.push({
          type: 'hire', icon: '🎯', timestamp: a.confirmed_at,
          text: `🎉 EMBAUCHE : ${a.missions?.establishments?.name || '?'} a validé ${a.talents?.first_name || 'un talent'} pour "${positionLabel(a.missions?.position)}"`,
        });
      }
    });
    appointments.forEach(rdv => {
      events.push({
        type: 'rdv', icon: '🗓', timestamp: rdv.created_at,
        text: `RDV proposé : ${rdv.applications?.missions?.establishments?.name || '?'} → ${rdv.applications?.talents?.first_name || 'talent'} (${formatDateTime(rdv.scheduled_at)})`,
      });
    });
    return events
      .filter(e => e.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
  }, [applications, appointments]);

  // Action : contacter l'établissement
  const handleContactEstablishment = async (mission) => {
    if (!mission.establishments?.user_id) {
      alert('Impossible : user_id établissement manquant');
      return;
    }
    const reason = mission._funnel.alert.reason || 'Mission stagnante';
    const positionTxt = positionLabel(mission.position);

    if (!confirm(`Envoyer une notification à ${mission.establishments?.name || "l'établissement"} ?\n\nMotif : ${reason}`)) return;

    setContactingId(mission.id);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: mission.establishments.user_id,
        type: 'mission_reminder',
        title: '👋 Un coup de main pour votre mission ?',
        content: `L'équipe ExtraTaff a remarqué que votre mission "${positionTxt}" pourrait avoir besoin d'attention. ${reason}. N'hésitez pas à revenir consulter vos candidatures.`,
        link: '/establishment/applications',
        read: false,
      });
      if (error) throw error;
      alert('✅ Notification envoyée à l\'établissement');
    } catch (err) {
      console.error('Erreur envoi notification:', err);
      alert('Erreur : ' + err.message);
    } finally {
      setContactingId(null);
    }
  };

  // Lookup établissement par mission (au cas où la prop missions n'a pas .establishments enrichi partout)
  const getEstabName = (m) => m.establishments?.name || '—';

  return (
    <div className="space-y-6">
      {/* Header + Toggle périmètre */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">📊 Funnel & Monitoring</h2>
          <p className="text-sm text-gray-500 mt-0.5">Suivi des missions, alertes et activité récente</p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'active', label: 'Actives' },
            { value: '30d', label: '30 derniers jours' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setScope(opt.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                scope === opt.value ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {onReload && (
            <button
              onClick={onReload}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-md"
              title="Rafraîchir les données"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* SECTION 1 — Métriques globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          icon="📩" label="Candidatures" value={metrics.totalCandidatures}
          sublabel={`${missionsWithFunnel.length} missions dans le scope`}
          color="blue"
        />
        <MetricCard
          icon="✅" label="Taux d'acceptation"
          value={`${metrics.tauxAcceptation}%`}
          sublabel={`${metrics.totalAccepted} acceptées`}
          color="purple"
        />
        <MetricCard
          icon="🎯" label="Taux d'embauche validée"
          value={`${metrics.tauxEmbauche}%`}
          sublabel={`${metrics.totalHired} embauches confirmées`}
          color={metrics.tauxEmbauche >= 30 ? 'green' : 'amber'}
        />
        <MetricCard
          icon="⏱" label="Délai moy. accept→embauche"
          value={metrics.avgDelay}
          sublabel={metrics.totalHired > 0 ? `sur ${metrics.totalHired} embauches` : 'pas encore de donnée'}
          color="green"
        />
      </div>

      {/* SECTION 2 — Funnel par mission */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Funnel par mission ({sortedMissions.length})
            {loadingMessages && <span className="ml-2 text-xs font-normal text-gray-400">Chargement messages…</span>}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Mission</th>
                <th className="px-3 py-2 text-left">Établissement</th>
                <th className="px-3 py-2 text-center">Âge</th>
                <th className="px-3 py-2 text-center">📩</th>
                <th className="px-3 py-2 text-center">✅</th>
                <th className="px-3 py-2 text-center">💬</th>
                <th className="px-3 py-2 text-center">🎯</th>
                <th className="px-3 py-2 text-left">Statut</th>
                <th className="px-3 py-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedMissions.map(m => {
                const f = m._funnel;
                const alertColors = {
                  critical: 'bg-red-50 text-red-800 border-red-200',
                  warning: 'bg-amber-50 text-amber-800 border-amber-200',
                  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                  ok: 'bg-gray-50 text-gray-600 border-gray-200',
                };
                const showActionButton = (f.alert.level === 'critical' || f.alert.level === 'warning') && m.establishments?.user_id;

                return (
                  <tr key={m.id} className="hover:bg-blue-50/50">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{positionLabel(m.position)}</div>
                      <div className="text-xs text-gray-400">{m.status}</div>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{getEstabName(m)}</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">{timeAgo(m.created_at)}</td>
                    <td className="px-3 py-2 text-center font-semibold text-blue-700">{f.candidatures}</td>
                    <td className="px-3 py-2 text-center font-semibold text-purple-700">{f.accepted}</td>
                    <td className="px-3 py-2 text-center font-semibold text-amber-700">{f.messagesCount}</td>
                    <td className="px-3 py-2 text-center font-semibold text-emerald-700">{f.hired}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${alertColors[f.alert.level]}`}>
                        {f.alert.icon} {f.alert.label}
                      </span>
                      {f.alert.reason && (
                        <div className="text-[10px] text-gray-500 mt-0.5 italic">{f.alert.reason}</div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {showActionButton && (
                        <button
                          onClick={() => handleContactEstablishment(m)}
                          disabled={contactingId === m.id}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-xs font-bold transition-colors"
                        >
                          {contactingId === m.id ? '...' : '📩 Contacter'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {sortedMissions.length === 0 && (
                <tr>
                  <td colSpan="9" className="px-3 py-8 text-center text-gray-400">
                    Aucune mission dans le périmètre sélectionné
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3 — Activité récente */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            🔴 Activité récente (50 dernières actions)
          </h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {recentActivity.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">Aucune activité enregistrée</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentActivity.map((e, idx) => (
                <li key={idx} className="px-4 py-2.5 flex items-start gap-3 hover:bg-blue-50/30 transition-colors">
                  <span className="flex-shrink-0 text-lg">{e.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">{e.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(e.timestamp)} • {formatDateTime(e.timestamp)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Légende des alertes */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <p className="font-bold mb-1">📖 Légende des alertes :</p>
        <ul className="space-y-0.5">
          <li>🚨 <strong>Stagnante</strong> : 10+ candidatures, 0 acceptation depuis 48h+</li>
          <li>⏳ <strong>Pas validée</strong> : chat actif (3+ msg) mais 0 embauche après 5j</li>
          <li>⚠️ <strong>À risque</strong> : candidature acceptée mais 0 message après 24h</li>
          <li>🟢 <strong>En cours</strong> : flux normal | ✅ <strong>Embauchée</strong> : mission validée</li>
        </ul>
      </div>
    </div>
  );
}
