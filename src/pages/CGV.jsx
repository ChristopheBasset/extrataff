import { Link } from 'react-router-dom';

const CGV = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link to="/" className="text-blue-200 hover:text-white text-sm mb-4 inline-block">
            ← Retour à l'accueil
          </Link>
          <h1 className="text-3xl font-bold">Conditions Générales de Vente</h1>
          <p className="text-blue-200 mt-2">Dernière mise à jour : 24 février 2026</p>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">

          {/* Article 1 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 1 — Objet</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes Conditions Générales de Vente (CGV) régissent l'utilisation de la plateforme ExtraTaff, éditée par CVBN CONSULTING (SASU au capital de 500,00 €, SIRET 984 685 933 00017, RCS Evreux), accessible à l'adresse https://extrataff.fr.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              ExtraTaff est une plateforme de mise en relation entre des établissements du secteur de l'hôtellerie-restauration (restaurants, hôtels, traiteurs, services de conciergerie, événementiel) et des travailleurs temporaires qualifiés (« extras »).
            </p>
          </section>

          {/* Article 2 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 2 — Inscription et accès au service</h2>
            <p className="text-gray-700 leading-relaxed">
              L'inscription sur ExtraTaff est ouverte à toute personne physique majeure (talent / extra) ou morale (établissement) exerçant dans le secteur de l'hôtellerie-restauration. L'inscription implique l'acceptation pleine et entière des présentes CGV.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              L'utilisateur s'engage à fournir des informations exactes et à les maintenir à jour. CVBN CONSULTING se réserve le droit de suspendre ou de supprimer tout compte dont les informations s'avéreraient inexactes ou frauduleuses.
            </p>
          </section>

          {/* Article 3 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 3 — Services proposés</h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p><strong>Pour les établissements :</strong></p>
              <p>Publication de missions temporaires, accès à un vivier de talents qualifiés, système de matching intelligent, messagerie intégrée, gestion des candidatures, planning des missions.</p>
              <p className="mt-3"><strong>Pour les talents (extras) :</strong></p>
              <p>Consultation et candidature aux missions disponibles, profil professionnel, messagerie avec les établissements, planning des missions acceptées. L'accès à la plateforme est entièrement gratuit pour les talents.</p>
            </div>
          </section>

          {/* Article 4 — Tarifs */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 4 — Tarifs et modalités de paiement</h2>

            <p className="text-gray-700 leading-relaxed mb-4">
              L'utilisation d'ExtraTaff est gratuite pour les talents. Les établissements bénéficient des conditions tarifaires suivantes :
            </p>

            {/* Freemium */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-4">
              <h3 className="font-semibold text-green-800 mb-2">Offre d'essai gratuite (Freemium)</h3>
              <p className="text-gray-700 text-sm">
                À l'inscription, chaque établissement bénéficie d'une mission gratuite (urgente ou non) au cours du premier mois. Les candidatures sont limitées à 10 candidats maximum par mission.
              </p>
            </div>

            {/* Club ExtraTaff */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-4">
              <h3 className="font-semibold text-blue-800 mb-2">Club ExtraTaff — Abonnement mensuel</h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p><strong>Abonnement :</strong> 20,00 € HT / mois (24,00 € TTC), incluant 1 mission (1 poste).</p>
                <p><strong>Mission supplémentaire :</strong> 9,00 € HT (10,80 € TTC) par mission, que celle-ci soit normale ou urgente.</p>
                <p>L'abonnement est sans engagement et peut être résilié à tout moment. La résiliation prend effet à la fin de la période en cours. La mission incluse est remise à zéro à chaque renouvellement mensuel.</p>
              </div>
            </div>

            {/* Sans abonnement */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Sans abonnement (paiement à l'acte)</h3>
              <div className="text-gray-700 text-sm space-y-2">
                <p><strong>Mission normale :</strong> 18,00 € HT (21,60 € TTC) par mission.</p>
                <p><strong>Mission urgente :</strong> 25,00 € HT (30,00 € TTC) par mission.</p>
              </div>
            </div>

            {/* Détection urgence */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-4">
              <h3 className="font-semibold text-orange-800 mb-2">Détection automatique des missions urgentes</h3>
              <p className="text-gray-700 text-sm">
                Une mission est automatiquement considérée comme urgente lorsque sa date de début est fixée au jour même (J) ou au lendemain (J+1). Ce caractère urgent est déterminé automatiquement par le système en fonction des dates saisies — il n'y a pas de sélection manuelle.
              </p>
            </div>

            <p className="text-gray-700 leading-relaxed">
              Tous les prix sont indiqués en euros. La TVA applicable est de 20 %. Les paiements sont traités de manière sécurisée par Stripe. Les factures sont disponibles dans l'espace client Stripe de l'établissement.
            </p>
          </section>

          {/* Article 5 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 5 — Droit de rétractation</h2>
            <p className="text-gray-700 leading-relaxed">
              Conformément à l'article L.221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux services pleinement exécutés avant la fin du délai de rétractation et dont l'exécution a commencé avec l'accord du consommateur. En souscrivant au Club ExtraTaff ou en achetant une mission, l'établissement reconnaît que le service commence immédiatement et renonce expressément à son droit de rétractation.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Toutefois, l'abonnement Club ExtraTaff étant sans engagement, il peut être résilié à tout moment depuis le portail client, la résiliation prenant effet à la fin de la période de facturation en cours.
            </p>
          </section>

          {/* Article 6 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 6 — Obligations des utilisateurs</h2>
            <div className="text-gray-700 leading-relaxed space-y-3">
              <p><strong>Les établissements s'engagent à :</strong></p>
              <p>
                Publier des offres de missions conformes à la législation du travail en vigueur, fournir des conditions de travail décentes et sécurisées, respecter les engagements pris vis-à-vis des extras recrutés via la plateforme (horaires, rémunération, conditions).
              </p>
              <p className="mt-3"><strong>Les talents (extras) s'engagent à :</strong></p>
              <p>
                Fournir un profil exact reflétant leurs compétences et disponibilités, honorer les missions acceptées sauf en cas de force majeure, se comporter de manière professionnelle dans leurs échanges et lors des missions.
              </p>
            </div>
          </section>

          {/* Article 7 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 7 — Rôle de la plateforme</h2>
            <p className="text-gray-700 leading-relaxed">
              ExtraTaff agit uniquement en qualité de plateforme de mise en relation. CVBN CONSULTING n'est en aucun cas employeur des extras et n'est pas partie aux contrats de travail ou de prestation qui peuvent être conclus entre les utilisateurs.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              CVBN CONSULTING ne garantit ni la disponibilité des extras, ni la qualité des missions proposées par les établissements, ni le bon déroulement des missions. Chaque utilisateur reste seul responsable de ses engagements contractuels et légaux.
            </p>
          </section>

          {/* Article 8 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 8 — Responsabilité</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la disponibilité et le bon fonctionnement de la plateforme. Toutefois, l'accès peut être interrompu pour maintenance ou mise à jour, sans que cela n'ouvre droit à indemnisation.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              CVBN CONSULTING ne saurait être tenue responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utiliser la plateforme, notamment en cas de perte de données, de manque à gagner ou d'atteinte à la réputation.
            </p>
          </section>

          {/* Article 9 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 9 — Propriété intellectuelle</h2>
            <p className="text-gray-700 leading-relaxed">
              Tous les éléments de la plateforme ExtraTaff (textes, images, logos, logiciels, base de données) sont protégés par le droit de la propriété intellectuelle. Leur reproduction ou utilisation sans autorisation est interdite.
            </p>
          </section>

          {/* Article 10 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 10 — Modification des CGV</h2>
            <p className="text-gray-700 leading-relaxed">
              CVBN CONSULTING se réserve le droit de modifier les présentes CGV à tout moment. Les utilisateurs seront informés de toute modification substantielle par email ou notification sur la plateforme. L'utilisation continue du service après notification vaut acceptation des nouvelles conditions.
            </p>
          </section>

          {/* Article 11 */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 11 — Droit applicable et litiges</h2>
            <p className="text-gray-700 leading-relaxed">
              Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le litige sera porté devant les tribunaux compétents d'Évreux.
            </p>
            <p className="text-gray-700 leading-relaxed mt-3">
              Conformément à l'article L.612-1 du Code de la consommation, le consommateur peut recourir gratuitement au service de médiation MEDICYS — 73 boulevard de Clichy, 75009 Paris — www.medicys.fr.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article 12 — Contact</h2>
            <div className="bg-gray-50 rounded-lg p-5 text-gray-700">
              <p><strong>CVBN CONSULTING</strong> — ExtraTaff</p>
              <p>1, sente aux Pruniers — 27120 Gadencourt</p>
              <p>Email : christophe@comunecom.fr</p>
              <p>SIRET : 984 685 933 00017</p>
              <p>TVA : FR23984685933</p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default CGV;
