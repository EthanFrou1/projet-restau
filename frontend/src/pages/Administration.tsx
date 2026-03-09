import { TabsContent } from "@/components/ui/tabs";
import { RestaurantManager } from "@/components/admin/RestaurantManager";
import { UserRestaurantAssign } from "@/components/admin/UserRestaurantAssign";
import { AdminScopeCard } from "@/components/admin/AdminScopeCard";
import { UserCreationCard } from "@/components/admin/UserCreationCard";
import { UserListCard } from "@/components/admin/UserListCard";
import { UserAssociationsCard } from "@/components/admin/UserAssociationsCard";
import type { AssocUser, DevUser, RestaurantRef, UserRole } from "@/components/admin/types";

type Props = {
  visible: boolean;
  isDev: boolean;
  isAdmin: boolean;
  displayName: string;
  adminRestaurants: RestaurantRef[];
  devUsersLoading: boolean;
  newFirstName: string;
  setNewFirstName: (value: string) => void;
  newLastName: string;
  setNewLastName: (value: string) => void;
  newEmail: string;
  setNewEmail: (value: string) => void;
  newRole: UserRole;
  setNewRole: (value: UserRole) => void;
  handleCreateUser: () => void;
  devUsers: DevUser[];
  meId?: number;
  onAskDeleteUser: (id: number, email: string) => void;
  pageSize: number;
  assocLoading: boolean;
  assocMsg: string | null;
  assocUsers: AssocUser[];
  assocUsersPageItems: AssocUser[];
  assocUsersPage: number;
  totalAssocPages: number;
  onSetAssocUsersPage: (page: number) => void;
  onRemoveAssoc: (user: AssocUser, code: string) => void;
  onSavedAssign: (userId: number, codes: string[]) => void | Promise<void>;
};

export function DevPage({
  visible,
  isDev,
  isAdmin,
  displayName,
  adminRestaurants,
  devUsersLoading,
  newFirstName,
  setNewFirstName,
  newLastName,
  setNewLastName,
  newEmail,
  setNewEmail,
  newRole,
  setNewRole,
  handleCreateUser,
  devUsers,
  meId,
  onAskDeleteUser,
  pageSize,
  assocLoading,
  assocMsg,
  assocUsers,
  assocUsersPageItems,
  assocUsersPage,
  totalAssocPages,
  onSetAssocUsersPage,
  onRemoveAssoc,
  onSavedAssign,
}: Props) {
  if (!visible) return null;

  return (
    <TabsContent value="dev" className="space-y-4">
      <div className="space-y-4">
        <AdminScopeCard isAdmin={isAdmin} displayName={displayName} adminRestaurants={adminRestaurants} />

        <div className="grid gap-4 xl:grid-cols-[35%_65%]">
          <UserCreationCard
            isDev={isDev}
            isAdmin={isAdmin}
            newFirstName={newFirstName}
            setNewFirstName={setNewFirstName}
            newLastName={newLastName}
            setNewLastName={setNewLastName}
            newEmail={newEmail}
            setNewEmail={setNewEmail}
            newRole={newRole}
            setNewRole={setNewRole}
            handleCreateUser={handleCreateUser}
          />
          <UserListCard
            isDev={isDev}
            isAdmin={isAdmin}
            meId={meId}
            users={devUsers}
            loading={devUsersLoading}
            onAskDeleteUser={onAskDeleteUser}
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[65%_35%]">
          <UserAssociationsCard
            assocLoading={assocLoading}
            assocMsg={assocMsg}
            assocUsers={assocUsers}
            assocUsersPageItems={assocUsersPageItems}
            assocUsersPage={assocUsersPage}
            pageSize={pageSize}
            totalAssocPages={totalAssocPages}
            onSetAssocUsersPage={onSetAssocUsersPage}
            onRemoveAssoc={onRemoveAssoc}
          />

          {isDev && <RestaurantManager />}
          <UserRestaurantAssign users={devUsers} assocUsers={assocUsers} onSaved={onSavedAssign} />
        </div>
      </div>
    </TabsContent>
  );
}
