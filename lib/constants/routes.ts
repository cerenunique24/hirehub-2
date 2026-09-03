export const ROUTES = {
    HOME: "/",
  
    LOGIN: "/login",
    REGISTER: "/register",
  
    CLIENT: {
      DASHBOARD: "/client/dashboard",
      CREATE_PROJECT: "/client/create-project",
      PROJECTS: "/client/projects",
      FREELANCERS: "/client/freelancers",
      COALITIONS: "/client/coalitions",
      PROPOSALS: "/client/proposals",
      INVITATIONS: "/client/invitations",
      MESSAGES: "/client/messages",
      PAYMENTS: "/client/payments",
      AI: "/client/ai",
      SETTINGS: "/client/settings",
    },

    FREELANCER: {
      DASHBOARD: "/freelancers/dashboard",
      DISCOVER: "/freelancers/discover",
      PROJECTS: "/freelancers/projects",
      COALITIONS: "/freelancers/coalitions",
      PROPOSALS: "/freelancers/proposals",
      INVITATIONS: "/freelancers/invitations",
      PROFILE: "/freelancers/profile",
      EARNINGS: "/freelancers/earnings",
      MESSAGES: "/freelancers/messages",
      NOTIFICATIONS: "/freelancers/notifications",
      AI: "/freelancers/ai",
      SETTINGS: "/freelancers/settings",
    },
  } as const;