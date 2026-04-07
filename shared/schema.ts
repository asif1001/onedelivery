export interface AppUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  branchIds: string[] | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}
