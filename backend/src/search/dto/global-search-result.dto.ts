export class GlobalSearchResultDto {
  labs: { id: string; name: string; teacherName?: string | null }[];
  users: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
  }[];
  sessions: {
    id: string;
    labId: string;
    labName?: string | null;
    startTime: string;
    endTime: string | null;
  }[];
  files: {
    id: string;
    name: string;
    labId?: string | null;
    sessionId?: string | null;
    ownerId?: string | null;
  }[];
}


