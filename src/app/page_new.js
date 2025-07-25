'use client';

import Link from 'next/link';
import Layout from '@/components/Layout';
import {
    Activity,
    ArrowRightLeft,
    Users,
    BarChart3,
    TrendingUp,
    Clock,
    Trophy,
    Target
} from 'lucide-react';

const features = [
    {
        name: 'Live Points Tracking',
        description: 'Track your team\'s performance in real-time during gameweeks with live score updates.',
        icon: Activity,
        href: '/live-points',
        color: 'from-green-400 to-green-600'
    },
    {
        name: 'Transfer Planner',
        description: 'Plan your transfers with price change alerts, player form analysis, and fixture difficulty.',
        icon: ArrowRightLeft,
        href: '/transfer-planner',
        color: 'from-blue-400 to-blue-600'
    },
    {
        name: 'Player Database',
        description: 'Comprehensive player statistics, form, ownership, and detailed performance metrics.',
        icon: Users,
        href: '/players',
        color: 'from-purple-400 to-purple-600'
    },
    {
        name: 'Statistics & Insights',
        description: 'Advanced analytics, team value tracking, and AI-powered transfer suggestions.',
        icon: BarChart3,
        href: '/statistics',
        color: 'from-pink-400 to-pink-600'
    }
];

const stats = [
    { name: 'Active Managers', value: '10M+', icon: Users },
    { name: 'Player Database', value: '600+', icon: Target },
    { name: 'Gameweeks', value: '38', icon: Clock },
    { name: 'Total Prize Money', value: '£1M+', icon: Trophy }
];

export default function Home() {
    return (
        <Layout>
            <div className="space-y-12">
                {/* Hero Section */}
                <div className="text-center space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            FPL Hub
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                            Your ultimate Fantasy Premier League companion. Track live points, plan transfers,
                            and get insights to dominate your mini-leagues.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                            <Activity className="w-5 h-5 mr-2" />
                            Get Started
                        </Link>
                        <Link
                            href="/players"
                            className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                        >
                            <Users className="w-5 h-5 mr-2" />
                            Browse Players
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <div
                                key={stat.name}
                                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 text-center"
                            >
                                <Icon className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                    {stat.name}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {features.map((feature) => {
                        const Icon = feature.icon;
                        return (
                            <Link
                                key={feature.name}
                                href={feature.href}
                                className="group relative bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                            >
                                <div className="space-y-4">
                                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center`}>
                                        <Icon className="w-6 h-6 text-white" />
                                    </div>

                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {feature.name}
                                    </h3>

                                    <p className="text-gray-600 dark:text-gray-300">
                                        {feature.description}
                                    </p>

                                    <div className="inline-flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium">
                                        Learn more
                                        <TrendingUp className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Call to Action */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 md:p-12 text-center text-white">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to improve your FPL game?
                    </h2>
                    <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                        Join thousands of managers using FPL Hub to gain the edge in their mini-leagues.
                        Get started with your manager ID and unlock powerful insights.
                    </p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center px-8 py-3 bg-white text-purple-600 font-medium rounded-md hover:bg-gray-100 transition-colors transform hover:scale-105"
                    >
                        Start Tracking Now
                        <Activity className="w-5 h-5 ml-2" />
                    </Link>
                </div>
            </div>
        </Layout>
    );
}
