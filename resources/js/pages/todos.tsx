import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCircle, Circle } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Todos',
        href: '/todos',
    },
];

interface Todo {
    id: number;
    title: string;
    completed: boolean;
    userId: number;
}

interface TodosProps {
    todos: Todo[];
}

export default function Todos({ todos }: TodosProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Todos" />
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Todos</h1>
                        <p className="text-muted-foreground">Liste des tâches récupérées depuis JSONPlaceholder</p>
                    </div>
                    <Badge variant="secondary">{todos.length} tâches</Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {todos.map((todo) => (
                        <Card key={todo.id} className="transition-shadow hover:shadow-md">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base">Tâche #{todo.id}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {todo.completed ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <Circle className="h-4 w-4 text-gray-400" />
                                        )}
                                        <Badge
                                            variant={todo.completed ? 'default' : 'secondary'}
                                            className={todo.completed ? 'bg-green-100 text-green-800' : ''}
                                        >
                                            {todo.completed ? 'Terminé' : 'En cours'}
                                        </Badge>
                                    </div>
                                </div>
                                <CardDescription>Utilisateur #{todo.userId}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed">{todo.title}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {todos.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Circle className="mb-4 h-12 w-12 text-gray-400" />
                        <h3 className="mb-2 text-lg font-semibold">Aucune tâche trouvée</h3>
                        <p className="text-muted-foreground">Impossible de récupérer les tâches depuis JSONPlaceholder.</p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
