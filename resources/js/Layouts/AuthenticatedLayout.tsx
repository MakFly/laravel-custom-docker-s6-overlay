import { ReactNode } from 'react';
import AppLayout from '@/layouts/app-layout';

interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthenticatedLayoutProps {
    user: User;
    header?: ReactNode;
    children: ReactNode;
}

export default function AuthenticatedLayout({ user, header, children }: AuthenticatedLayoutProps) {
    return (
        <AppLayout>
            {header && (
                <header className="bg-white shadow">
                    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}
            
            <main>
                {children}
            </main>
        </AppLayout>
    );
} 