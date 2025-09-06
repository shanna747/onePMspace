import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import ProjectSettings from "./ProjectSettings";

import AddProject from "./AddProject";

import ProjectManagersList from "./ProjectManagersList";

import ActiveProjects from "./ActiveProjects";

import OverdueProjects from "./OverdueProjects";

import TestCardDetails from "./TestCardDetails";

import ClientProjectManage from "./ClientProjectManage";

import ClientProjectView from "./ClientProjectView";

import AdminTimelineTemplates from "./AdminTimelineTemplates";

import ObeyaBoards from "./ObeyaBoards";

import CreateObeyaBoard from "./CreateObeyaBoard";

import ObeyaBoard from "./ObeyaBoard";

import CreateObeyaCard from "./CreateObeyaCard";

import WireFrames from "./WireFrames";

import CreateWireFrame from "./CreateWireFrame";

import TaskDetail from "./TaskDetail";

import UserManagement from "./UserManagement";

import EmployeeOnboarding from "./EmployeeOnboarding";

import ProductHub from "./ProductHub";

import CreateTestCard from "./CreateTestCard";

import LandingPage from "./LandingPage";

import KnowledgeBase from "./KnowledgeBase";

import ViewArticle from "./ViewArticle";

import AdminKnowledgeBase from "./AdminKnowledgeBase";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    ProjectSettings: ProjectSettings,
    
    AddProject: AddProject,
    
    ProjectManagersList: ProjectManagersList,
    
    ActiveProjects: ActiveProjects,
    
    OverdueProjects: OverdueProjects,
    
    TestCardDetails: TestCardDetails,
    
    ClientProjectManage: ClientProjectManage,
    
    ClientProjectView: ClientProjectView,
    
    AdminTimelineTemplates: AdminTimelineTemplates,
    
    ObeyaBoards: ObeyaBoards,
    
    CreateObeyaBoard: CreateObeyaBoard,
    
    ObeyaBoard: ObeyaBoard,
    
    CreateObeyaCard: CreateObeyaCard,
    
    WireFrames: WireFrames,
    
    CreateWireFrame: CreateWireFrame,
    
    TaskDetail: TaskDetail,
    
    UserManagement: UserManagement,
    
    EmployeeOnboarding: EmployeeOnboarding,
    
    ProductHub: ProductHub,
    
    CreateTestCard: CreateTestCard,
    
    LandingPage: LandingPage,
    
    KnowledgeBase: KnowledgeBase,
    
    ViewArticle: ViewArticle,
    
    AdminKnowledgeBase: AdminKnowledgeBase,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Dashboard />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/ProjectSettings" element={<ProjectSettings />} />
                
                <Route path="/AddProject" element={<AddProject />} />
                
                <Route path="/ProjectManagersList" element={<ProjectManagersList />} />
                
                <Route path="/ActiveProjects" element={<ActiveProjects />} />
                
                <Route path="/OverdueProjects" element={<OverdueProjects />} />
                
                <Route path="/TestCardDetails" element={<TestCardDetails />} />
                
                <Route path="/ClientProjectManage" element={<ClientProjectManage />} />
                
                <Route path="/ClientProjectView" element={<ClientProjectView />} />
                
                <Route path="/AdminTimelineTemplates" element={<AdminTimelineTemplates />} />
                
                <Route path="/ObeyaBoards" element={<ObeyaBoards />} />
                
                <Route path="/CreateObeyaBoard" element={<CreateObeyaBoard />} />
                
                <Route path="/ObeyaBoard" element={<ObeyaBoard />} />
                
                <Route path="/CreateObeyaCard" element={<CreateObeyaCard />} />
                
                <Route path="/WireFrames" element={<WireFrames />} />
                
                <Route path="/CreateWireFrame" element={<CreateWireFrame />} />
                
                <Route path="/TaskDetail" element={<TaskDetail />} />
                
                <Route path="/UserManagement" element={<UserManagement />} />
                
                <Route path="/EmployeeOnboarding" element={<EmployeeOnboarding />} />
                
                <Route path="/ProductHub" element={<ProductHub />} />
                
                <Route path="/CreateTestCard" element={<CreateTestCard />} />
                
                <Route path="/LandingPage" element={<LandingPage />} />
                
                <Route path="/KnowledgeBase" element={<KnowledgeBase />} />
                
                <Route path="/ViewArticle" element={<ViewArticle />} />
                
                <Route path="/AdminKnowledgeBase" element={<AdminKnowledgeBase />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}