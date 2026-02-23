import { Link } from 'react-router-dom';

export default function Confidentialite() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Retour à l'accueil</Link>
          <h1 className="text-3xl font-bold text-white">Politique de confidentialité</h1>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Responsable du traitement</h2>
            <p>Le responsable du traitement des données personnelles est :</p>
            <ul className="mt-3 space-y-1 text-sm">
              <li><strong>ExtraTaff SAS</strong> (en cours d'immatriculation)</li>
              <li><strong>Représentant :</strong> Christophe Basset</li>
              <li><strong>Adresse :</strong> 1, sente aux Pruniers — 27120 Gadencourt</li>
              <li><strong>Contact :</strong> <a href="mailto:christophe@comunecom.fr" className="text-blue-600 hover:underline">christophe@comunecom.fr</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Données collectées</h2>
            <p>Nous collectons les données suivantes selon le type d'utilisateur :</p>
            
            <p className="font-semibold text-gray-900 mt-4">Pour les talents :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Nom, prénom, adresse email, numéro de téléphone</li>
              <li>• Date de naissance, nationalité</li>
              <li>• Expérience professionnelle, postes recherchés, disponibilités</li>
              <li>• Départements de recherche</li>
              <li>• CV (si téléchargé)</li>
              <li>• Photo de profil (optionnelle)</li>
            </ul>

            <p className="font-semibold text-gray-900 mt-4">Pour les établissements :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Nom de l'établissement, type, adresse, numéro de téléphone</li>
              <li>• Adresse email du responsable</li>
              <li>• Numéro SIRET</li>
              <li>• Informations relatives aux missions publiées</li>
              <li>• Données de paiement (traitées de manière sécurisée par Stripe, ExtraTaff n'a pas accès aux numéros de carte bancaire)</li>
            </ul>

            <p className="font-semibold text-gray-900 mt-4">Données techniques :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Adresse IP, type de navigateur, données de connexion</li>
              <li>• Données d'utilisation de la plateforme (pages visitées, actions effectuées)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Finalités du traitement</h2>
            <p>Les données personnelles sont collectées pour les finalités suivantes :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Création et gestion des comptes utilisateurs</li>
              <li>• Mise en relation entre talents et établissements (matching)</li>
              <li>• Gestion des candidatures et des missions</li>
              <li>• Messagerie intégrée entre utilisateurs</li>
              <li>• Envoi de notifications (SMS, email) relatives à l'activité du compte</li>
              <li>• Gestion des paiements et des abonnements</li>
              <li>• Amélioration de la plateforme et analyse statistique anonymisée</li>
              <li>• Respect des obligations légales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Base légale du traitement</h2>
            <p>Le traitement des données repose sur :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>L'exécution du contrat :</strong> les données sont nécessaires pour fournir le service de mise en relation.</li>
              <li>• <strong>Le consentement :</strong> pour l'envoi de communications commerciales et l'utilisation de cookies non essentiels.</li>
              <li>• <strong>L'intérêt légitime :</strong> pour l'amélioration de la plateforme et la prévention des fraudes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Destinataires des données</h2>
            <p>
              Les données personnelles sont accessibles uniquement par ExtraTaff SAS et ses prestataires techniques (hébergement, envoi de SMS et emails). Elles ne sont jamais vendues ni cédées à des tiers à des fins commerciales.
            </p>
            <p className="mt-2">Dans le cadre de la mise en relation :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Les établissements ont accès au prénom, à l'expérience et aux disponibilités des talents ayant candidaté.</li>
              <li>• Les talents ont accès au nom et à la localisation approximative des établissements.</li>
              <li>• Les coordonnées complètes ne sont partagées qu'après confirmation mutuelle de l'embauche.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Sous-traitants</h2>
            <p>Nos prestataires techniques sont :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Supabase</strong> (base de données, authentification et fonctions serveur)</li>
              <li>• <strong>Netlify</strong> (hébergement du site web)</li>
              <li>• <strong>Stripe</strong> (traitement des paiements et gestion des abonnements)</li>
              <li>• <strong>Brevo</strong> (envoi de SMS et emails transactionnels)</li>
              <li>• <strong>Resend</strong> (envoi d'emails transactionnels)</li>
            </ul>
            <p className="mt-2">
              Ces prestataires traitent les données uniquement pour le compte d'ExtraTaff SAS et conformément à nos instructions, dans le respect du RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Durée de conservation</h2>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Comptes actifs :</strong> les données sont conservées pendant toute la durée d'utilisation du compte.</li>
              <li>• <strong>Comptes inactifs :</strong> les données sont supprimées après 24 mois d'inactivité.</li>
              <li>• <strong>Après suppression du compte :</strong> les données sont supprimées dans un délai de 30 jours, sauf obligation légale de conservation.</li>
              <li>• <strong>Données de facturation :</strong> conservées 10 ans conformément aux obligations comptables.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Vos droits (RGPD)</h2>
            <p>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• <strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles.</li>
              <li>• <strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes.</li>
              <li>• <strong>Droit à l'effacement :</strong> demander la suppression de vos données.</li>
              <li>• <strong>Droit à la limitation :</strong> restreindre le traitement de vos données.</li>
              <li>• <strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
              <li>• <strong>Droit d'opposition :</strong> vous opposer au traitement de vos données.</li>
            </ul>
            <p className="mt-3">
              Pour exercer vos droits, contactez-nous à : <a href="mailto:christophe@comunecom.fr" className="text-blue-600 hover:underline">christophe@comunecom.fr</a>. Nous répondrons dans un délai maximum de 30 jours.
            </p>
            <p className="mt-2">
              Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">www.cnil.fr</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Cookies</h2>
            <p>
              La plateforme ExtraTaff utilise des cookies strictement nécessaires au bon fonctionnement du service (authentification, session utilisateur). Aucun cookie publicitaire ou de pistage n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Sécurité des données</h2>
            <p>
              ExtraTaff SAS met en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos données personnelles contre l'accès non autorisé, la perte, la destruction ou la divulgation. Les communications sont chiffrées via HTTPS et les mots de passe sont stockés sous forme hachée.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Modification de la politique</h2>
            <p>
              ExtraTaff SAS se réserve le droit de modifier la présente politique de confidentialité à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou notification sur la plateforme.
            </p>
          </section>

        </div>

        <p className="text-center text-gray-400 text-xs mt-8">Dernière mise à jour : février 2026</p>
      </div>
    </div>
  );
}
