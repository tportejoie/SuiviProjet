
'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  FolderKanban,
  CalendarClock,
  LayoutDashboard,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { Project, Client, ProjectType, Contact, ProjectSituationSnapshot, User, UserRole } from '@/types';
import { getClients, getContacts, getProjects, getSnapshots, logout, updateProjectManager } from '@/lib/api';
import Dashboard from './Dashboard';
import ClientList from './ClientList';
import ProjectList from './ProjectList';
import ProjectDetail from './ProjectDetail';
import ImputationManager from './ImputationManager';
import Logo from './Logo';
import UserList from './UserList';
import CompanySettings from './CompanySettings';

type View = 'dashboard' | 'clients' | 'projects' | 'imputations' | 'detail' | 'users' | 'company';

interface AppProps {
  currentUser: User;
}

const App: React.FC<AppProps> = ({ currentUser }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [clients, setClients] = useState<Client[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectSituationSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('detail');
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const selectedContact = contacts.find(c => c.id === selectedProject?.contactId);
  const selectedClient = clients.find(c => c.id === selectedProject?.clientId);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'projects', label: 'Projets', icon: FolderKanban },
    { id: 'imputations', label: 'Imputations AT', icon: CalendarClock },
    ...(currentUser.role === UserRole.ADMIN ? [
      { id: 'users', label: 'Utilisateurs', icon: Users },
      { id: 'company', label: 'Entreprise', icon: Users }
    ] : [])
  ];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [clientsData, contactsData, projectsData, snapshotsData] = await Promise.all([
          getClients(),
          getContacts(),
          getProjects(),
          getSnapshots()
        ]);
        setClients(clientsData);
        setContacts(contactsData);
        setProjects(projectsData);
        setSnapshots(snapshotsData);
      } catch {
        window.location.href = "/login";
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const updateProject = async (updated: Project) => {
    const saved = await updateProjectManager(updated.id, updated.projectManager);
    setProjects(prev => prev.map(p => p.id === saved.id ? saved : p));
  };

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col no-print shadow-2xl z-20`}>
        <div className="p-6 flex items-center justify-between border-b border-slate-800">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <Logo className="h-7" showText={false} />
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white uppercase">JAMAE</span>
                <span className="text-[10px] text-amber-500 font-black tracking-widest uppercase -mt-1">project</span>
              </div>
            </div>
          ) : (
            <Logo className="h-7" showText={false} />
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400">
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 mt-6 px-3 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`w-full flex items-center p-3 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <item.icon size={22} className={isSidebarOpen ? 'mr-3' : ''} />
              {isSidebarOpen && <span className="font-semibold">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 text-[10px] text-slate-500 border-t border-slate-800">
          {isSidebarOpen ? 'JAMAE project Platform v1.2' : 'v1.2'}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center px-8 justify-between sticky top-0 z-10 no-print">
          <div className="flex items-center text-slate-400 text-sm">
             <span className="capitalize font-medium">{currentView}</span>
             {selectedProject && currentView === 'detail' && (
               <>
                 <ChevronRight size={14} className="mx-2" />
                 <span className="font-bold text-slate-900">{selectedProject.projectNumber}</span>
               </>
             )}
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">
                {currentUser.name || currentUser.email}
              </span>
              <span className="text-[10px] text-amber-600 font-black uppercase tracking-tighter">
                {currentUser.role === UserRole.ADMIN ? 'Administrateur' : 'Chef de Projet'}
              </span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center font-black text-amber-700 shadow-sm">
              {(currentUser.name || currentUser.email).split(' ').map(n => n[0]).join('')}
            </div>
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/login";
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              Deconnexion
            </button>
          </div>
        </header>

        <div className="p-8 pb-20 max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && (
            <Dashboard projects={projects} clients={clients} snapshots={snapshots} isLoading={isLoading} />
          )}
          {currentView === 'clients' && (
            <ClientList
              clients={clients}
              contacts={contacts}
              currentUser={currentUser}
              onCreated={(client) => setClients(prev => {
                const exists = prev.some(c => c.id === client.id);
                if (exists) {
                  return prev.map(c => c.id === client.id ? client : c);
                }
                return [client, ...prev];
              })}
              onDeleted={(clientId) => setClients(prev => prev.filter(c => c.id !== clientId))}
            />
          )}
          {currentView === 'projects' && (
            <ProjectList
              projects={projects}
              clients={clients}
              contacts={contacts}
              currentUser={currentUser}
              onSelect={handleSelectProject}
              onCreated={(project) => setProjects(prev => {
                const exists = prev.some(p => p.id === project.id);
                if (exists) {
                  return prev.map(p => p.id === project.id ? project : p);
                }
                return [project, ...prev];
              })}
              onUpdated={(project) => setProjects(prev => prev.map(p => p.id === project.id ? project : p))}
              onDeleted={(projectId) => setProjects(prev => prev.filter(p => p.id !== projectId))}
              onContactCreated={(contact) => setContacts(prev => {
                const exists = prev.some(c => c.id === contact.id);
                return exists ? prev : [contact, ...prev];
              })}
            />
          )}
          {currentView === 'imputations' && (
            <ImputationManager 
              projects={projects.filter(p => p.type === ProjectType.AT)} 
              currentUser={currentUser}
            />
          )}
          {currentView === 'detail' && selectedProject && selectedContact && selectedClient && (
            <ProjectDetail 
              project={selectedProject} 
              client={selectedClient}
              contact={selectedContact}
              onUpdateProject={updateProject}
            />
          )}
          {currentView === 'users' && currentUser.role === UserRole.ADMIN && (
            <UserList currentUser={currentUser} />
          )}
          {currentView === 'company' && currentUser.role === UserRole.ADMIN && (
            <CompanySettings />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
