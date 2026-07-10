export const ROUTE_PATH = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CONVERSATION: '/c',
  CONVERSATION_BY_ID: '/c/:id',
  NOT_FOUND: '/:pathMatch(.*)*',
} as const;
