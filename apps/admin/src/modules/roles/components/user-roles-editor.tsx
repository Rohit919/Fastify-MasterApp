import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { getUserRoles, setUserRoles } from "../api/roles";
import { useRoles } from "../hooks/use-roles";

export function UserRolesEditor({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const roles = useRoles();
  const assigned = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: () => getUserRoles(userId),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () => setUserRoles(userId, selected),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["user-roles", userId] });
      onClose();
    },
  });

  useEffect(() => {
    if (assigned.data) setSelected(assigned.data);
  }, [assigned.data]);

  return (
    <div
      style={{
        marginTop: 20,
        padding: 16,
        border: "1px solid #cbd5e1",
        borderRadius: 8,
      }}
    >
      <h2>Roles for {userId}</h2>
      {(roles.data ?? []).map((role) => (
        <label key={role.id} style={{ display: "block", padding: 4 }}>
          <input
            type="checkbox"
            checked={selected.includes(role.name)}
            onChange={(event) =>
              setSelected((current) =>
                event.target.checked
                  ? [...current, role.name]
                  : current.filter((name) => name !== role.name),
              )
            }
          />{" "}
          {role.name}
        </label>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button
          disabled={save.isPending || assigned.isLoading}
          onClick={() => save.mutate()}
        >
          Save roles
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
      {(assigned.error || save.error) && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {(assigned.error || save.error)!.message}
        </p>
      )}
    </div>
  );
}
