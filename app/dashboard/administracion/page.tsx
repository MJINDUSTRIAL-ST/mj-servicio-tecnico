"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "personal@mjindustrial.cl";

type AccessLevel = "none" | "view" | "edit";

type ModuleKey =
  | "dashboard"
  | "clientes"
  | "servicio_tecnico"
  | "ventas"
  | "logistica"
  | "administracion"
  | "reportes";

type RoleActions = {
  approve_diagnostics: boolean;
  create_internal_quote: boolean;
  download_pdf: boolean;
  is_administrator: boolean;
};

type RolePermissions = {
  modules: Record<ModuleKey, AccessLevel>;
  actions: RoleActions;
};

type InternalRole = {
  role_key: string;
  name: string;
  description: string;
  sort_order: number;
  permissions: RolePermissions;
};

type InternalUser = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  job_title: string;
  role_key: string;
  is_active: boolean;
};

type NewUserForm = {
  name: string;
  email: string;
  job_title: string;
  role_key: string;
};

const MODULES: Array<{
  key: ModuleKey;
  label: string;
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
  },
  {
    key: "clientes",
    label: "Clientes",
  },
  {
    key: "servicio_tecnico",
    label: "Servicio técnico",
  },
  {
    key: "ventas",
    label: "Ventas",
  },
  {
    key: "logistica",
    label: "Logística",
  },
  {
    key: "administracion",
    label: "Administración",
  },
  {
    key: "reportes",
    label: "Reportes",
  },
];

const EMPTY_FORM: NewUserForm = {
  name: "",
  email: "",
  job_title: "",
  role_key: "tecnico",
};

function createSupabaseBrowserClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

function accessLabel(access: AccessLevel): string {
  if (access === "edit") {
    return "Editar";
  }

  if (access === "view") {
    return "Ver";
  }

  return "Sin acceso";
}

export default function AdministracionPage() {
  const [supabase] = useState<SupabaseClient>(() =>
    createSupabaseBrowserClient(),
  );

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [currentEmail, setCurrentEmail] = useState("");

  const [roles, setRoles] = useState<InternalRole[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);

  const [savingRole, setSavingRole] = useState<string | null>(null);
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);

  const [showNewUser, setShowNewUser] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_FORM);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const usersByRole = useMemo(() => {
    const grouped: Record<string, InternalUser[]> = {};

    for (const role of roles) {
      grouped[role.role_key] = [];
    }

    for (const user of users) {
      if (!grouped[user.role_key]) {
        grouped[user.role_key] = [];
      }

      grouped[user.role_key].push(user);
    }

    return grouped;
  }, [roles, users]);

  useEffect(() => {
    void initializePage();
  }, []);

  async function initializePage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      const email = user?.email?.trim().toLowerCase() ?? "";

      setCurrentEmail(email);

      if (!user || email !== ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(false);
        return;
      }

      setAuthorized(true);

      await loadAdministrationData();
    } catch (initializationError) {
      console.error(initializationError);

      setError(
        initializationError instanceof Error
          ? initializationError.message
          : "No fue posible cargar Administración.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadAdministrationData() {
    const [rolesResult, usersResult] = await Promise.all([
      supabase
        .from("internal_roles")
        .select(
          "role_key, name, description, sort_order, permissions",
        )
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("internal_users")
        .select(
          "id, auth_user_id, name, email, job_title, role_key, is_active",
        )
        .order("name", {
          ascending: true,
        }),
    ]);

    if (rolesResult.error) {
      throw rolesResult.error;
    }

    if (usersResult.error) {
      throw usersResult.error;
    }

    setRoles((rolesResult.data ?? []) as InternalRole[]);
    setUsers((usersResult.data ?? []) as InternalUser[]);
  }

  function updateModuleAccess(
    roleKey: string,
    moduleKey: ModuleKey,
    access: AccessLevel,
  ) {
    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.role_key !== roleKey) {
          return role;
        }

        return {
          ...role,
          permissions: {
            ...role.permissions,
            modules: {
              ...role.permissions.modules,
              [moduleKey]: access,
            },
          },
        };
      }),
    );
  }

  function updateSpecialPermission(
    roleKey: string,
    actionKey: keyof RoleActions,
    checked: boolean,
  ) {
    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.role_key !== roleKey) {
          return role;
        }

        return {
          ...role,
          permissions: {
            ...role.permissions,
            actions: {
              ...role.permissions.actions,
              [actionKey]: checked,
            },
          },
        };
      }),
    );
  }

  async function saveRolePermissions(role: InternalRole) {
    setSavingRole(role.role_key);
    setMessage("");
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("internal_roles")
        .update({
          permissions: role.permissions,
        })
        .eq("role_key", role.role_key);

      if (updateError) {
        throw updateError;
      }

      setMessage(`Permisos de ${role.name} guardados correctamente.`);
    } catch (saveError) {
      console.error(saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar los permisos.",
      );
    } finally {
      setSavingRole(null);
    }
  }

  function openNewUserForm(roleKey: string) {
    setNewUser({
      ...EMPTY_FORM,
      role_key: roleKey,
    });

    setShowNewUser(true);
    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeNewUserForm() {
    if (creatingUser) {
      return;
    }

    setShowNewUser(false);
    setNewUser(EMPTY_FORM);
  }

  async function createInternalUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = newUser.name.trim();
    const cleanEmail = newUser.email.trim().toLowerCase();
    const cleanJobTitle = newUser.job_title.trim();

    if (!cleanName) {
      setError("Debes ingresar el nombre del usuario.");
      return;
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Debes ingresar un correo válido.");
      return;
    }

    if (!newUser.role_key) {
      setError("Debes seleccionar un rol.");
      return;
    }

    setCreatingUser(true);
    setMessage("");
    setError("");

    try {
      const { data, error: insertError } = await supabase
        .from("internal_users")
        .insert({
          name: cleanName,
          email: cleanEmail,
          job_title: cleanJobTitle,
          role_key: newUser.role_key,
          is_active: true,
        })
        .select(
          "id, auth_user_id, name, email, job_title, role_key, is_active",
        )
        .single();

      if (insertError) {
        throw insertError;
      }

      setUsers((currentUsers) =>
        [...currentUsers, data as InternalUser].sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      );

      setNewUser(EMPTY_FORM);
      setShowNewUser(false);
      setMessage(`${cleanEmail} fue agregado correctamente.`);
    } catch (createError) {
      console.error(createError);

      const createMessage =
        createError instanceof Error
          ? createError.message
          : "No fue posible agregar el usuario.";

      if (
        createMessage.toLowerCase().includes("duplicate") ||
        createMessage.toLowerCase().includes("unique")
      ) {
        setError("Ese correo ya está registrado.");
      } else {
        setError(createMessage);
      }
    } finally {
      setCreatingUser(false);
    }
  }

  async function updateUserStatus(
    userId: string,
    isActive: boolean,
  ) {
    setUpdatingUser(userId);
    setMessage("");
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("internal_users")
        .update({
          is_active: isActive,
        })
        .eq("id", userId);

      if (updateError) {
        throw updateError;
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? {
                ...user,
                is_active: isActive,
              }
            : user,
        ),
      );

      setMessage(
        isActive
          ? "Usuario activado correctamente."
          : "Usuario desactivado correctamente.",
      );
    } catch (statusError) {
      console.error(statusError);

      setError(
        statusError instanceof Error
          ? statusError.message
          : "No fue posible cambiar el estado del usuario.",
      );
    } finally {
      setUpdatingUser(null);
    }
  }

  if (loading) {
    return (
      <main className="administration-page">
        <section className="loading-card">
          <div className="loader" />
          <p>Cargando Administración...</p>
        </section>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="administration-page">
        <section className="access-card">
          <div className="access-icon">🔒</div>

          <h1>Acceso restringido</h1>

          <p>
            No tienes autorización para ingresar al módulo de
            Administración.
          </p>

          {currentEmail ? (
            <div className="current-email">
              Sesión iniciada como:
              <strong>{currentEmail}</strong>
            </div>
          ) : (
            <div className="current-email">
              No existe una sesión activa.
            </div>
          )}
        </section>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="administration-page">
      <header className="page-header">
        <div>
          <span className="section-label">CONFIGURACIÓN INTERNA</span>

          <h1>Administración</h1>

          <p>
            Controla los usuarios internos, sus roles y los módulos a
            los que pueden acceder.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => openNewUserForm("tecnico")}
        >
          + Nuevo usuario interno
        </button>
      </header>

      {message ? (
        <div className="notification success-notification">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="notification error-notification">
          {error}
        </div>
      ) : null}

      {showNewUser ? (
        <section className="new-user-panel">
          <div className="panel-header">
            <div>
              <span className="section-label">NUEVO USUARIO</span>
              <h2>Agregar usuario interno</h2>
            </div>

            <button
              type="button"
              className="close-button"
              onClick={closeNewUserForm}
              disabled={creatingUser}
              aria-label="Cerrar formulario"
            >
              ×
            </button>
          </div>

          <form
            className="new-user-form"
            onSubmit={createInternalUser}
          >
            <label>
              <span>Nombre</span>

              <input
                type="text"
                value={newUser.name}
                onChange={(event) =>
                  setNewUser((currentForm) => ({
                    ...currentForm,
                    name: event.target.value,
                  }))
                }
                placeholder="Ejemplo: Gustavo Santana"
                disabled={creatingUser}
              />
            </label>

            <label>
              <span>Email</span>

              <input
                type="email"
                value={newUser.email}
                onChange={(event) =>
                  setNewUser((currentForm) => ({
                    ...currentForm,
                    email: event.target.value,
                  }))
                }
                placeholder="nombre@mjindustrial.cl"
                disabled={creatingUser}
              />
            </label>

            <label>
              <span>Cargo</span>

              <input
                type="text"
                value={newUser.job_title}
                onChange={(event) =>
                  setNewUser((currentForm) => ({
                    ...currentForm,
                    job_title: event.target.value,
                  }))
                }
                placeholder="Ejemplo: Técnico de servicio"
                disabled={creatingUser}
              />
            </label>

            <label>
              <span>Rol</span>

              <select
                value={newUser.role_key}
                onChange={(event) =>
                  setNewUser((currentForm) => ({
                    ...currentForm,
                    role_key: event.target.value,
                  }))
                }
                disabled={creatingUser}
              >
                {roles.map((role) => (
                  <option
                    key={role.role_key}
                    value={role.role_key}
                  >
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={closeNewUserForm}
                disabled={creatingUser}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="primary-button"
                disabled={creatingUser}
              >
                {creatingUser
                  ? "Guardando..."
                  : "Agregar usuario"}
              </button>
            </div>
          </form>

          <div className="form-information">
            <strong>Importante:</strong> en esta etapa se registra el
            usuario y su rol. La contraseña y la invitación para iniciar
            sesión se configurarán en el siguiente desarrollo.
          </div>
        </section>
      ) : null}

      <section className="roles-grid">
        {roles.map((role) => {
          const associatedUsers = usersByRole[role.role_key] ?? [];

          return (
            <article
              key={role.role_key}
              className="role-card"
            >
              <div className="role-card-header">
                <div>
                  <span className="role-label">ROL INTERNO</span>
                  <h2>{role.name}</h2>
                </div>

                <span className="user-count">
                  {associatedUsers.length}{" "}
                  {associatedUsers.length === 1
                    ? "usuario"
                    : "usuarios"}
                </span>
              </div>

              <p className="role-description">
                {role.description}
              </p>

              <div className="permissions-section">
                <h3>Acceso por módulo</h3>

                <div className="module-list">
                  {MODULES.map((module) => {
                    const access =
                      role.permissions?.modules?.[module.key] ??
                      "none";

                    return (
                      <label
                        className="module-row"
                        key={module.key}
                      >
                        <span>{module.label}</span>

                        <select
                          value={access}
                          onChange={(event) =>
                            updateModuleAccess(
                              role.role_key,
                              module.key,
                              event.target.value as AccessLevel,
                            )
                          }
                        >
                          <option value="none">
                            {accessLabel("none")}
                          </option>

                          <option value="view">
                            {accessLabel("view")}
                          </option>

                          <option value="edit">
                            {accessLabel("edit")}
                          </option>
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="special-permissions">
                <h3>Permisos especiales</h3>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      role.permissions?.actions
                        ?.approve_diagnostics ?? false
                    }
                    onChange={(event) =>
                      updateSpecialPermission(
                        role.role_key,
                        "approve_diagnostics",
                        event.target.checked,
                      )
                    }
                  />

                  <span>Puede aprobar diagnósticos</span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      role.permissions?.actions
                        ?.create_internal_quote ?? false
                    }
                    onChange={(event) =>
                      updateSpecialPermission(
                        role.role_key,
                        "create_internal_quote",
                        event.target.checked,
                      )
                    }
                  />

                  <span>Puede generar cotización interna</span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      role.permissions?.actions?.download_pdf ??
                      false
                    }
                    onChange={(event) =>
                      updateSpecialPermission(
                        role.role_key,
                        "download_pdf",
                        event.target.checked,
                      )
                    }
                  />

                  <span>Puede descargar PDF</span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={
                      role.permissions?.actions
                        ?.is_administrator ?? false
                    }
                    onChange={(event) =>
                      updateSpecialPermission(
                        role.role_key,
                        "is_administrator",
                        event.target.checked,
                      )
                    }
                  />

                  <span>Es administrador</span>
                </label>
              </div>

              <button
                type="button"
                className="save-role-button"
                onClick={() => saveRolePermissions(role)}
                disabled={savingRole === role.role_key}
              >
                {savingRole === role.role_key
                  ? "Guardando..."
                  : "Guardar permisos"}
              </button>

              <div className="users-section">
                <div className="users-header">
                  <h3>Usuarios asociados</h3>

                  <button
                    type="button"
                    className="small-add-button"
                    onClick={() =>
                      openNewUserForm(role.role_key)
                    }
                  >
                    + Agregar
                  </button>
                </div>

                {associatedUsers.length === 0 ? (
                  <div className="empty-users">
                    No hay usuarios asociados a este rol.
                  </div>
                ) : (
                  <div className="users-list">
                    {associatedUsers.map((user) => (
                      <div
                        className="user-item"
                        key={user.id}
                      >
                        <div className="user-information">
                          <strong>{user.name}</strong>

                          <span>{user.email}</span>

                          {user.job_title ? (
                            <small>{user.job_title}</small>
                          ) : null}
                        </div>

                        <select
                          className={
                            user.is_active
                              ? "status-select active-status"
                              : "status-select inactive-status"
                          }
                          value={
                            user.is_active
                              ? "active"
                              : "inactive"
                          }
                          onChange={(event) =>
                            updateUserStatus(
                              user.id,
                              event.target.value === "active",
                            )
                          }
                          disabled={
                            updatingUser === user.id ||
                            user.email.toLowerCase() ===
                              ADMIN_EMAIL.toLowerCase()
                          }
                        >
                          <option value="active">Activo</option>
                          <option value="inactive">
                            Inactivo
                          </option>
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .administration-page {
    min-height: 100%;
    padding: 32px;
    background: #f4f5f7;
    color: #182230;
  }

  .page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 24px;
  }

  .page-header h1 {
    margin: 5px 0 7px;
    font-size: 32px;
    line-height: 1.15;
    letter-spacing: -0.7px;
  }

  .page-header p {
    max-width: 680px;
    margin: 0;
    color: #667085;
    font-size: 15px;
    line-height: 1.6;
  }

  .section-label,
  .role-label {
    display: block;
    color: #667085;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .primary-button,
  .secondary-button,
  .save-role-button,
  .small-add-button,
  .close-button {
    border: 0;
    font: inherit;
    cursor: pointer;
  }

  .primary-button {
    min-height: 42px;
    padding: 0 18px;
    border-radius: 10px;
    background: #2563eb;
    color: #ffffff;
    font-size: 14px;
    font-weight: 750;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  .primary-button:hover {
    background: #1d4ed8;
  }

  .primary-button:disabled,
  .secondary-button:disabled,
  .save-role-button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .notification {
    margin-bottom: 20px;
    padding: 13px 15px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 650;
  }

  .success-notification {
    border: 1px solid #abefc6;
    background: #ecfdf3;
    color: #067647;
  }

  .error-notification {
    border: 1px solid #fecdca;
    background: #fef3f2;
    color: #b42318;
  }

  .new-user-panel {
    margin-bottom: 24px;
    padding: 24px;
    border: 1px solid #dfe3e8;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 20px;
  }

  .panel-header h2 {
    margin: 5px 0 0;
    font-size: 21px;
  }

  .close-button {
    width: 36px;
    height: 36px;
    border-radius: 9px;
    background: #f2f4f7;
    color: #475467;
    font-size: 23px;
    line-height: 1;
  }

  .new-user-form {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  .new-user-form label {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .new-user-form label span {
    font-size: 13px;
    font-weight: 700;
  }

  .new-user-form input,
  .new-user-form select {
    width: 100%;
    min-height: 42px;
    padding: 0 12px;
    border: 1px solid #d0d5dd;
    border-radius: 9px;
    outline: none;
    background: #ffffff;
    color: #182230;
    font: inherit;
    font-size: 14px;
  }

  .new-user-form input:focus,
  .new-user-form select:focus,
  .module-row select:focus,
  .status-select:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    grid-column: 1 / -1;
    gap: 10px;
    padding-top: 3px;
  }

  .secondary-button {
    min-height: 42px;
    padding: 0 18px;
    border: 1px solid #d0d5dd;
    border-radius: 10px;
    background: #ffffff;
    color: #344054;
    font-size: 14px;
    font-weight: 700;
  }

  .form-information {
    margin-top: 17px;
    padding: 12px 14px;
    border-radius: 9px;
    background: #f8fafc;
    color: #667085;
    font-size: 13px;
    line-height: 1.55;
  }

  .roles-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: 20px;
  }

  .role-card {
    overflow: hidden;
    border: 1px solid #e1e5ea;
    border-radius: 16px;
    background: #ffffff;
    box-shadow: 0 4px 18px rgba(16, 24, 40, 0.04);
  }

  .role-card-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 23px 23px 12px;
  }

  .role-card-header h2 {
    margin: 5px 0 0;
    font-size: 22px;
    letter-spacing: -0.3px;
  }

  .user-count {
    flex-shrink: 0;
    padding: 6px 9px;
    border-radius: 999px;
    background: #eef4ff;
    color: #3538cd;
    font-size: 12px;
    font-weight: 750;
  }

  .role-description {
    min-height: 48px;
    margin: 0;
    padding: 0 23px 20px;
    color: #667085;
    font-size: 14px;
    line-height: 1.55;
  }

  .permissions-section,
  .special-permissions {
    padding: 19px 23px;
    border-top: 1px solid #edf0f2;
  }

  .permissions-section h3,
  .special-permissions h3,
  .users-section h3 {
    margin: 0 0 13px;
    font-size: 14px;
  }

  .module-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
  }

  .module-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .module-row > span {
    color: #344054;
    font-size: 13px;
    font-weight: 650;
  }

  .module-row select {
    width: 145px;
    min-height: 36px;
    padding: 0 10px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    outline: none;
    background: #ffffff;
    color: #344054;
    font: inherit;
    font-size: 13px;
  }

  .special-permissions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .special-permissions h3 {
    margin-bottom: 3px;
  }

  .checkbox-row {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #344054;
    font-size: 13px;
    cursor: pointer;
  }

  .checkbox-row input {
    width: 16px;
    height: 16px;
    accent-color: #2563eb;
  }

  .save-role-button {
    width: calc(100% - 46px);
    min-height: 40px;
    margin: 0 23px 21px;
    border-radius: 9px;
    background: #182230;
    color: #ffffff;
    font-size: 13px;
    font-weight: 750;
  }

  .save-role-button:hover {
    background: #101828;
  }

  .users-section {
    padding: 20px 23px 23px;
    border-top: 1px solid #edf0f2;
    background: #fafbfc;
  }

  .users-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .users-header h3 {
    margin: 0;
  }

  .small-add-button {
    padding: 6px 9px;
    border-radius: 7px;
    background: #eaf1ff;
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 750;
  }

  .empty-users {
    margin-top: 14px;
    padding: 13px;
    border: 1px dashed #d0d5dd;
    border-radius: 9px;
    color: #667085;
    font-size: 13px;
    text-align: center;
  }

  .users-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 14px;
  }

  .user-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 11px 12px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #ffffff;
  }

  .user-information {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .user-information strong {
    overflow: hidden;
    color: #182230;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-information span {
    overflow: hidden;
    color: #475467;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-information small {
    color: #98a2b3;
    font-size: 11px;
  }

  .status-select {
    flex-shrink: 0;
    min-height: 32px;
    padding: 0 8px;
    border-radius: 8px;
    outline: none;
    font: inherit;
    font-size: 12px;
    font-weight: 700;
  }

  .active-status {
    border: 1px solid #abefc6;
    background: #ecfdf3;
    color: #067647;
  }

  .inactive-status {
    border: 1px solid #fecdca;
    background: #fef3f2;
    color: #b42318;
  }

  .loading-card,
  .access-card {
    max-width: 520px;
    margin: 80px auto;
    padding: 34px;
    border: 1px solid #e1e5ea;
    border-radius: 16px;
    background: #ffffff;
    text-align: center;
    box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
  }

  .loading-card {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 13px;
    color: #475467;
    font-size: 14px;
    font-weight: 650;
  }

  .loader {
    width: 22px;
    height: 22px;
    border: 3px solid #dbe4f0;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .access-icon {
    margin-bottom: 10px;
    font-size: 34px;
  }

  .access-card h1 {
    margin: 0 0 10px;
    font-size: 25px;
  }

  .access-card p {
    margin: 0;
    color: #667085;
    font-size: 14px;
    line-height: 1.55;
  }

  .current-email {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 20px;
    padding: 12px;
    border-radius: 9px;
    background: #f5f7fa;
    color: #667085;
    font-size: 12px;
  }

  .current-email strong {
    color: #344054;
    font-size: 13px;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 1150px) {
    .roles-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 820px) {
    .administration-page {
      padding: 22px 16px;
    }

    .page-header {
      flex-direction: column;
    }

    .page-header .primary-button {
      width: 100%;
    }

    .new-user-form {
      grid-template-columns: 1fr;
    }

    .form-actions {
      grid-column: auto;
    }
  }

  @media (max-width: 520px) {
    .role-card-header {
      flex-direction: column;
    }

    .module-row {
      align-items: flex-start;
      flex-direction: column;
      gap: 6px;
    }

    .module-row select {
      width: 100%;
    }

    .user-item {
      align-items: flex-start;
      flex-direction: column;
    }

    .status-select {
      width: 100%;
    }
  }
`;