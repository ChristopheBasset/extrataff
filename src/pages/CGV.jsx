import { Link } from 'react-router-dom';

export default function CGV() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Link to="/" className="text-white/80 hover:text-white text-sm mb-4 inline-block">← Retour à l'accueil</Link>
          <h1 className="text-3xl font-bold text-white">Conditions générales de vente et d'utilisation</h1>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm p-6 sm:p-10 space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente et d'Utilisation (ci-après « CGVU ») régissent l'accès et l'utilisation de la plateforme ExtraTaff, accessible à l'adresse <strong>extrataff.fr</strong>, éditée par ExtraTaff SAS.
            </p>
            <p className="mt-2">
              ExtraTaff est une plateforme de mise en relation entre des établissements du secteur CHR (Cafés, Hôtels, Restaurants) et des talents du secteur de l'hôtellerie-restauration. ExtraTaff n'est ni une agence d'intérim, ni un employeur. La plateforme facilite la mise en relation mais ne se substitue pas aux obligations légales des parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Acceptation des CGVU</h2>
            <p>
              L'inscription sur la plateforme implique l'acceptation pleine et entière des présentes CGVU. L'utilisateur reconnaît avoir lu et compris l'intégralité de ces conditions avant de s'inscrire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Inscription et comptes utilisateurs</h2>
            <p>
              L'inscription est ouverte aux personnes physiques majeures (talents) et aux personnes morales (établissements). L'utilisateur s'engage à fournir des informations exactes, complètes et à jour. Chaque utilisateur est responsable de la confidentialité de ses identifiants de connexion.
            </p>
            <p className="mt-2">
              ExtraTaff SAS se réserve le droit de suspendre ou supprimer tout compte dont les informations seraient fausses, incomplètes ou en cas de non-respect des présentes CGVU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Services proposés</h2>
            <p className="font-semibold text-gray-900 mt-2">Pour les talents (gratuit) :</p>
            <p>
              Création de profil, consultation des missions matchées, candidature aux missions, messagerie intégrée avec les établissements, notifications SMS et email.
            </p>
            <p className="font-semibold text-gray-900 mt-4">Pour les établissements :</p>
            <p>
              Création de profil, publication de missions, consultation et gestion des candidatures, messagerie intégrée avec les talents, notifications SMS et email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Tarifs et abonnements</h2>
            <p className="font-semibold text-gray-900">Talents :</p>
            <p>L'utilisation de la plateforme est entièrement gratuite pour les talents.</p>

            <p className="font-semibold text-gray-900 mt-4">Établissements :</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>• <strong>Essai gratuit (Freemium) :</strong> 1 mission offerte (urgente ou non) le premier mois suivant l'inscription.</li>
              <li>• <strong>Club ExtraTaff :</strong> 20,00 € HT (24,00 € TTC) / mois, sans engagement. Inclut 1 mission par mois. Missions supplémentaires à 9,00 € HT (10,80 € TTC) chacune. Missions urgentes au même tarif de 9,00 € HT (10,80 € TTC) pour les abonnés.</li>
              <li>• <strong>Sans abonnement :</strong> 18,00 € HT (21,60 € TTC) par mission normale. 25,00 € HT (30,00 € TTC) par mission urgente.</li>
              <li>• <strong>Offre Groupe :</strong> Tarification sur mesure pour les établissements gérant plusieurs points de vente. Nous contacter.</li>
            </ul>
            <p className="mt-3">
              Une mission est qualifiée d'« urgente » automatiquement lorsque sa date de début est fixée au jour même ou au lendemain. Cette détection est automatique et ne fait l'objet d'aucun choix manuel.
            </p>
            <p className="mt-2">
              Chaque mission est limitée à 10 candidatures maximum.
            </p>
            <p className="mt-3">
              Les prix sont indiqués en euros hors taxes. La TVA applicable sera ajoutée au montant facturé conformément à la réglementation en vigueur. ExtraTaff SAS se réserve le droit de modifier ses tarifs à tout moment, les nouveaux tarifs s'appliquant à compter du renouvellement suivant.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Paiement et facturation</h2>
            <p>
              Les paiements sont traités de manière sécurisée par notre prestataire Stripe. ExtraTaff SAS n'a jamais accès aux numéros de carte bancaire. Une facture est émise pour chaque transaction.
            </p>
            <p className="mt-2">
              Pour les abonnés Club ExtraTaff, le prélèvement est mensuel et automatique. La mission incluse dans l'abonnement est réinitialisée à chaque renouvellement mensuel.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Résiliation</h2>
            <p>
              L'abonnement Club ExtraTaff est sans engagement. L'établissement peut résilier à tout moment depuis son espace personnel ou via le portail client Stripe. La résiliation prend effet à la fin de la période en cours. Aucun remboursement ne sera effectué pour la période entamée.
            </p>
            <p className="mt-2">
              Les talents peuvent supprimer leur compte à tout moment en contactant le support.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Obligations des utilisateurs</h2>
            <p>Les utilisateurs s'engagent à :</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>• Utiliser la plateforme de manière loyale et conformément à sa destination.</li>
              <li>• Ne pas publier de contenu illicite, diffamatoire, discriminatoire ou contraire à l'ordre public.</li>
              <li>• Respecter la législation du travail en vigueur concernant l'embauche d'extras et de travailleurs temporaires.</li>
              <li>• Ne pas contourner la plateforme pour contacter directement les utilisateurs en dehors du système de messagerie.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Responsabilité d'ExtraTaff</h2>
            <p>
              ExtraTaff SAS agit en qualité de plateforme de mise en relation. Elle ne saurait être tenue responsable des relations contractuelles entre les établissements et les talents, ni des conditions de travail, de la rémunération ou de tout litige entre les parties.
            </p>
            <p className="mt-2">
              ExtraTaff SAS s'efforce d'assurer la disponibilité et le bon fonctionnement de la plateforme, mais ne garantit pas un accès ininterrompu. ExtraTaff SAS ne pourra être tenue responsable en cas de force majeure ou d'interruption temporaire pour maintenance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments de la plateforme ExtraTaff est protégé par les lois relatives à la propriété intellectuelle. Les utilisateurs s'interdisent de reproduire, copier ou exploiter tout ou partie de la plateforme sans autorisation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Protection des données personnelles</h2>
            <p>
              Le traitement des données personnelles est détaillé dans notre <Link to="/politique-confidentialite" className="text-blue-600 hover:underline">Politique de confidentialité</Link>. En utilisant la plateforme, l'utilisateur consent au traitement de ses données conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Modification des CGVU</h2>
            <p>
              ExtraTaff SAS se réserve le droit de modifier les présentes CGVU à tout moment. Les utilisateurs seront informés par email ou notification sur la plateforme. La poursuite de l'utilisation de la plateforme après modification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">13. Droit applicable et litiges</h2>
            <p>
              Les présentes CGVU sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera soumis aux tribunaux compétents du ressort du siège social d'ExtraTaff SAS.
            </p>
          </section>

        </div>

        <p className="text-center text-gray-400 text-xs mt-8">Dernière mise à jour : février 2026</p>
      </div>
    </div>
  );
}
