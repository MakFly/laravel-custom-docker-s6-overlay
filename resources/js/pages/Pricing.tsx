import { CheckCircle, X } from 'lucide-react';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Plan {
    name: string;
    description: string;
    priceMonthly: number | string;
    priceAnnual: number | string;
    contracts: number | string;
    popular: boolean;
    features: string[];
    limitations: string[];
}

interface FAQ {
    question: string;
    answer: string;
}

export default function Pricing() {
    const [isAnnual, setIsAnnual] = useState<boolean>(false);

    const plans: Plan[] = [
        {
            name: 'Starter',
            description: 'Parfait pour les freelances et petites entreprises',
            priceMonthly: 19,
            priceAnnual: 15,
            contracts: 10,
            popular: false,
            features: [
                '10 contrats surveillés',
                'Alertes email automatiques',
                'OCR intelligent',
                'Tableau de bord basique',
                'Support email (48h)',
                'Historique 1 an',
            ],
            limitations: ["Pas d'alertes SMS", "Pas d'export avancé", "Pas d'intégrations"],
        },
        {
            name: 'Pro',
            description: 'Idéal pour les entreprises en croissance',
            priceMonthly: 49,
            priceAnnual: 39,
            contracts: 50,
            popular: true,
            features: [
                '50 contrats surveillés',
                'Alertes email + SMS',
                'OCR avancé + IA',
                'Analytics détaillés',
                'Support prioritaire (24h)',
                'Historique illimité',
                'Export Excel/PDF',
                'Intégration calendrier',
                'Rapports personnalisés',
                "API d'accès",
            ],
            limitations: [],
        },
        {
            name: 'Enterprise',
            description: 'Pour les grandes organisations',
            priceMonthly: 'Sur mesure',
            priceAnnual: 'Sur mesure',
            contracts: 'Illimité',
            popular: false,
            features: [
                'Contrats illimités',
                'Toutes les fonctionnalités Pro',
                'Support dédié 24/7',
                'Onboarding personnalisé',
                'Intégrations sur mesure',
                'SLA garanti',
                'Formation équipe',
                'Compte manager dédié',
            ],
            limitations: [],
        },
    ];

    const faqs: FAQ[] = [
        {
            question: "Comment fonctionne l'essai gratuit ?",
            answer: "Vous bénéficiez de 7 jours d'essai gratuit avec accès à toutes les fonctionnalités du plan Pro. Aucune carte bancaire requise. Vous pouvez annuler à tout moment.",
        },
        {
            question: 'Puis-je changer de plan à tout moment ?',
            answer: 'Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Les changements prennent effet immédiatement et la facturation est ajustée au prorata.',
        },
        {
            question: 'Que se passe-t-il si je dépasse ma limite de contrats ?',
            answer: "Vous recevrez une notification avant d'atteindre votre limite. Vous pourrez soit upgrader votre plan, soit supprimer d'anciens contrats pour faire de la place.",
        },
        {
            question: 'Mes données sont-elles sécurisées ?',
            answer: 'Absolument. Nous utilisons un chiffrement de niveau bancaire (SSL 256-bit) et stockons vos données sur des serveurs européens conformes RGPD.',
        },
        {
            question: 'Proposez-vous des réductions pour les associations ?',
            answer: 'Oui, nous offrons 50% de réduction pour les associations et organisations à but non lucratif. Contactez-nous pour en bénéficier.',
        },
    ];

    return (
        <>
            <Head title="Tarifs - Préavis" />

            {/* Header */}
            <header className="bg-white shadow-sm">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between py-6">
                        <div className="flex items-center">
                            <Link href="/" className="text-2xl font-bold text-indigo-600">
                                Préavis
                            </Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="text-gray-500 hover:text-gray-900">
                                Accueil
                            </Link>
                            <Link href="/login" className="text-gray-500 hover:text-gray-900">
                                Connexion
                            </Link>
                            <Link href="/register" className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">
                                Essai Gratuit
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 text-white">
                <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                    <h1 className="mb-6 text-4xl font-bold md:text-5xl">Tarifs simples et transparents</h1>
                    <p className="mb-8 text-xl text-indigo-100">Choisissez le plan qui correspond à vos besoins. Changez à tout moment.</p>

                    {/* Toggle Annual/Monthly */}
                    <div className="mb-8 flex items-center justify-center">
                        <span className={`mr-3 ${!isAnnual ? 'text-white' : 'text-indigo-200'}`}>Mensuel</span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                isAnnual ? 'bg-white' : 'bg-indigo-400'
                            }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-indigo-600 transition-transform ${
                                    isAnnual ? 'translate-x-6' : 'translate-x-1'
                                }`}
                            />
                        </button>
                        <span className={`ml-3 ${isAnnual ? 'text-white' : 'text-indigo-200'}`}>
                            Annuel
                            <span className="ml-1 rounded-full bg-green-500 px-2 py-1 text-xs font-semibold text-white">-20%</span>
                        </span>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="bg-gray-50 py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid gap-8 lg:grid-cols-3">
                        {plans.map((plan, index) => (
                            <div
                                key={index}
                                className={`relative rounded-lg bg-white p-8 shadow-lg ${plan.popular ? 'scale-105 ring-2 ring-indigo-600' : ''}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                                        <span className="rounded-full bg-indigo-600 px-4 py-1 text-sm font-semibold text-white">
                                            Le plus populaire
                                        </span>
                                    </div>
                                )}

                                <div className="mb-8 text-center">
                                    <h3 className="mb-2 text-2xl font-bold text-gray-900">{plan.name}</h3>
                                    <p className="mb-4 text-gray-500">{plan.description}</p>
                                    <div className="mb-2 text-4xl font-bold text-indigo-600">
                                        {typeof plan.priceMonthly === 'number' ? (
                                            <>
                                                {isAnnual ? plan.priceAnnual : plan.priceMonthly}€<span className="text-lg text-gray-500">/mois</span>
                                            </>
                                        ) : (
                                            <span className="text-2xl">{plan.priceMonthly}</span>
                                        )}
                                    </div>
                                    {typeof plan.priceMonthly === 'number' && isAnnual && (
                                        <p className="text-sm text-gray-500">Facturé {(plan.priceAnnual as number) * 12}€/an</p>
                                    )}
                                    <p className="text-gray-500">
                                        {typeof plan.contracts === 'number' ? `Jusqu'à ${plan.contracts} contrats` : plan.contracts}
                                    </p>
                                </div>

                                <ul className="mb-8 space-y-3">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center">
                                            <CheckCircle className="mr-3 h-5 w-5 flex-shrink-0 text-green-500" />
                                            <span className="text-gray-600">{feature}</span>
                                        </li>
                                    ))}
                                    {plan.limitations.map((limitation, i) => (
                                        <li key={i} className="flex items-center">
                                            <X className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400" />
                                            <span className="text-gray-400">{limitation}</span>
                                        </li>
                                    ))}
                                </ul>

                                {plan.name === 'Enterprise' ? (
                                    <button className="w-full rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition hover:bg-gray-800">
                                        Nous contacter
                                    </button>
                                ) : (
                                    <Link
                                        href="/register"
                                        className={`block w-full rounded-lg px-6 py-3 text-center font-semibold transition ${
                                            plan.popular
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                                        }`}
                                    >
                                        Commencer l'essai gratuit
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-12 text-center">
                        <p className="mb-4 text-gray-600">✓ Essai gratuit 7 jours • ✓ Sans engagement • ✓ Annulation facile</p>
                        <p className="text-sm text-gray-500">Toutes les fonctionnalités incluses pendant l'essai gratuit</p>
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Comparaison détaillée des plans</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full rounded-lg bg-white shadow-lg">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left font-semibold text-gray-900">Fonctionnalités</th>
                                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Starter</th>
                                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Pro</th>
                                    <th className="px-6 py-4 text-center font-semibold text-gray-900">Enterprise</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                <tr>
                                    <td className="px-6 py-4 font-medium text-gray-900">Contrats surveillés</td>
                                    <td className="px-6 py-4 text-center">10</td>
                                    <td className="px-6 py-4 text-center">50</td>
                                    <td className="px-6 py-4 text-center">Illimité</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">Alertes email</td>
                                    <td className="px-6 py-4 text-center">✓</td>
                                    <td className="px-6 py-4 text-center">✓</td>
                                    <td className="px-6 py-4 text-center">✓</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-medium text-gray-900">Alertes SMS</td>
                                    <td className="px-6 py-4 text-center">-</td>
                                    <td className="px-6 py-4 text-center">✓</td>
                                    <td className="px-6 py-4 text-center">✓</td>
                                </tr>
                                <tr className="bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">OCR Intelligence</td>
                                    <td className="px-6 py-4 text-center">Basique</td>
                                    <td className="px-6 py-4 text-center">Avancé</td>
                                    <td className="px-6 py-4 text-center">Premium</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4 font-medium text-gray-900">Support</td>
                                    <td className="px-6 py-4 text-center">Email 48h</td>
                                    <td className="px-6 py-4 text-center">Prioritaire 24h</td>
                                    <td className="px-6 py-4 text-center">Dédié 24/7</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="bg-gray-50 py-16">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 text-center">
                        <h2 className="mb-4 text-3xl font-bold text-gray-900">Questions fréquentes</h2>
                    </div>

                    <div className="space-y-6">
                        {faqs.map((faq, index) => (
                            <div key={index} className="rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="mb-2 font-semibold text-gray-900">{faq.question}</h3>
                                <p className="text-gray-600">{faq.answer}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="bg-indigo-600 py-16 text-white">
                <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
                    <h2 className="mb-4 text-3xl font-bold">Prêt à économiser sur vos contrats ?</h2>
                    <p className="mb-8 text-xl text-indigo-100">Commencez votre essai gratuit dès maintenant. Aucune carte bancaire requise.</p>
                    <Link
                        href="/register"
                        className="inline-block rounded-lg bg-white px-8 py-3 text-lg font-semibold text-indigo-600 transition hover:bg-gray-50"
                    >
                        Commencer l'essai gratuit
                    </Link>
                </div>
            </section>
        </>
    );
} 