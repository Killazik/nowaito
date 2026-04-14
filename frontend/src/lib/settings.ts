export type VisibilityMode = 'all' | 'nobody' | 'selected';
export type CanMessageMode = 'all' | 'contacts';
export type MessageTextSize = 'sm' | 'md' | 'lg';

export type SelectablePerson = {
  id: string;
  label: string;
};

export type AppSettings = {
  general: {
    messageTextSize: MessageTextSize;
  };
  notifications: {
    enabled: boolean;
  };
  privacy: {
    blacklist: SelectablePerson[];
    phoneVisibility: VisibilityMode;
    phoneVisibleTo: SelectablePerson[];
    photoVisibility: VisibilityMode;
    photoVisibleTo: SelectablePerson[];
    canMessage: CanMessageMode;
  };
};

const STORAGE_KEY = 'nowaito_settings';

export const defaultSettings: AppSettings = {
  general: {
    messageTextSize: 'md',
  },
  notifications: {
    enabled: false,
  },
  privacy: {
    blacklist: [],
    phoneVisibility: 'all',
    phoneVisibleTo: [],
    photoVisibility: 'all',
    photoVisibleTo: [],
    canMessage: 'all',
  },
};

export const loadAppSettings = (): AppSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      general: {
        ...defaultSettings.general,
        ...parsed.general,
      },
      notifications: {
        ...defaultSettings.notifications,
        ...parsed.notifications,
      },
      privacy: {
        ...defaultSettings.privacy,
        ...parsed.privacy,
        blacklist: parsed.privacy?.blacklist ?? defaultSettings.privacy.blacklist,
        phoneVisibleTo: parsed.privacy?.phoneVisibleTo ?? defaultSettings.privacy.phoneVisibleTo,
        photoVisibleTo: parsed.privacy?.photoVisibleTo ?? defaultSettings.privacy.photoVisibleTo,
      },
    };
  } catch {
    return defaultSettings;
  }
};

export const saveAppSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
};
