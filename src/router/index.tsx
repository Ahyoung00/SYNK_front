import { createBrowserRouter, Navigate } from 'react-router-dom'

// Layouts
import AppLayout from '@/components/layout/AppLayout'

// Auth
import LoginPage from '@/pages/auth/LoginPage'
import OnboardingPage from '@/pages/auth/OnboardingPage'
import OAuthCallbackPage from '@/pages/auth/OAuthCallbackPage'

// Home
import HomePage from '@/pages/home/HomePage'

// Mission flow
import MissionDetailPage from '@/pages/mission/MissionDetailPage'
import MissionCameraPage from '@/pages/mission/MissionCameraPage'
import MissionWaitingPage from '@/pages/mission/MissionWaitingPage'
import MissionProcessingPage from '@/pages/mission/MissionProcessingPage'
import MissionResultPage from '@/pages/collage/MissionResultPage'

// Room
import RoomsPage from '@/pages/room/RoomsPage'
import RoomPage from '@/pages/room/RoomPage'
import RoomAlbumPage from '@/pages/album/RoomAlbumPage'
import SynkLogDetailPage from '@/pages/album/SynkLogDetailPage'
import RoomChatPage from '@/pages/chat/RoomChatPage'
import RoomSettingsPage from '@/pages/room/RoomSettingsPage'
import RoomMembersPage from '@/pages/room/RoomMembersPage'
import CreateRoomPage from '@/pages/room/CreateRoomPage'
import RoomCreatedPage from '@/pages/room/RoomCreatedPage'
import JoinRoomPage from '@/pages/room/JoinRoomPage'
import InvitePage from '@/pages/room/InvitePage'

// Tabs
import NotificationsPage from '@/pages/notifications/NotificationsPage'
import CollectionPage from '@/pages/collection/CollectionPage'
import CollectionDetailPage from '@/pages/collection/CollectionDetailPage'

// Profile
import ProfilePage from '@/pages/profile/ProfilePage'
import ProfileEditPage from '@/pages/profile/ProfileEditPage'
import WithdrawPage from '@/pages/profile/WithdrawPage'
import HelpPage from '@/pages/profile/HelpPage'
import VersionPage from '@/pages/profile/VersionPage'

// Auth guard
import { AuthGuard } from './AuthGuard'

export const router = createBrowserRouter([
  // ── Public ─────────────────────────────────────────────────────────────────
  { path: '/onboarding',          element: <OnboardingPage /> },
  { path: '/login',               element: <LoginPage /> },
  { path: '/kakao-callback.html', element: <OAuthCallbackPage provider="kakao" /> },
  { path: '/google-callback.html', element: <OAuthCallbackPage provider="google" /> },
  { path: '/invite/:code',        element: <InvitePage /> },

  // ── Protected ──────────────────────────────────────────────────────────────
  {
    element: <AuthGuard />,
    children: [

      // BottomNav 탭 레이아웃: 홈 / 도감 / 방 / 마이
      {
        element: <AppLayout />,
        children: [
          { path: '/',           element: <HomePage /> },
          { path: '/collection', element: <CollectionPage /> },
          { path: '/collection/:missionId', element: <CollectionDetailPage /> },
          { path: '/rooms',      element: <RoomsPage /> },
          { path: '/profile',    element: <ProfilePage /> },
        ],
      },

      // 알림: 벨 아이콘 → 풀스크린 (탭 없음)
      { path: '/notifications', element: <NotificationsPage /> },

      // Full-screen: 방 상세 / 채팅 / 설정 / 앨범
      { path: '/room/create',                       element: <CreateRoomPage /> },
      { path: '/room/join',                         element: <JoinRoomPage /> },
      { path: '/room/:roomId',                      element: <RoomPage /> },
      { path: '/room/:roomId/created',              element: <RoomCreatedPage /> },
      { path: '/room/:roomId/album',                element: <RoomAlbumPage /> },
      { path: '/room/:roomId/album/:date',           element: <SynkLogDetailPage /> },
      { path: '/room/:roomId/chat',                 element: <RoomChatPage /> },
      { path: '/room/:roomId/settings',             element: <RoomSettingsPage /> },
      { path: '/room/:roomId/settings/members',     element: <RoomMembersPage /> },

      // Mission flow
      { path: '/mission/:roomId',            element: <MissionDetailPage /> },
      { path: '/mission/:roomId/camera',     element: <MissionCameraPage /> },
      { path: '/mission/:roomId/waiting',    element: <MissionWaitingPage /> },
      { path: '/mission/:roomId/processing', element: <MissionProcessingPage /> },
      { path: '/result/:missionId',          element: <MissionResultPage /> },

      // Profile
      { path: '/profile/edit',     element: <ProfileEditPage /> },
      { path: '/profile/withdraw', element: <WithdrawPage /> },
      { path: '/profile/help',     element: <HelpPage /> },
      { path: '/profile/version',  element: <VersionPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
])
