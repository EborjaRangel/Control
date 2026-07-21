"use client";

import { Formik, Form, Field } from "formik";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { TableWrap } from "@/components/TableWrap";
import { apiFetch } from "@/lib/api";
import { USERNAME_REGEX } from "@/lib/auth";
import {
  STAFF_ROL_LABEL,
  puedeAsignarRolStaff,
  puedeDarDeBajaUsuarioStaff,
  puedeEditarUsuarioStaff,
  type StaffRol,
  type StaffUserDTO,
} from "@/lib/usuarios";
import * as Yup from "yup";

type FormValues = {
  username: string;
  password: string;
  rol: StaffRol;
  activo: boolean;
};

const createSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario: 3–32 caracteres (letras, números, . _ -)")
    .required("El usuario es obligatorio"),
  password: Yup.string().min(6, "Mínimo 6 caracteres").required("La contraseña es obligatoria"),
  rol: Yup.string().oneOf(["ADMIN", "COORDINADOR", "SUPERVISOR", "ASISTENCIA", "CONVOCATORIA"]).required(),
});

const editSchema = Yup.object({
  username: Yup.string()
    .trim()
    .matches(USERNAME_REGEX, "Usuario: 3–32 caracteres (letras, números, . _ -)")
    .required("El usuario es obligatorio"),
  password: Yup.string()
    .transform((v) => (v === "" || v == null ? undefined : v))
    .min(6, "Mínimo 6 caracteres")
    .optional(),
  rol: Yup.string().oneOf(["ADMIN", "COORDINADOR", "SUPERVISOR", "ASISTENCIA", "CONVOCATORIA"]).required(),
  activo: Yup.boolean().required(),
});

function emptyForm(): FormValues {
  return { username: "", password: "", rol: "SUPERVISOR", activo: true };
}

export default function UsuariosPage() {
  const pathname = usePathname();
  const { isStaff, user: session } = useAuth();
  const [usuarios, setUsuarios] = useState<StaffUserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffUserDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/usuarios");
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Error al cargar usuarios");
      }
      setUsuarios((await res.json()) as StaffUserDTO[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isStaff) return;
    void load();
  }, [isStaff, load, pathname]);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(u: StaffUserDTO) {
    setEditing(u);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSubmit(values: FormValues) {
    setSaving(true);
    setError(null);
    try {
      const isEdit = Boolean(editing);
      const res = await apiFetch(isEdit ? `/api/usuarios/${editing!.id}` : "/api/usuarios", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEdit
            ? {
                username: values.username.trim(),
                rol: values.rol,
                activo: values.activo,
                ...(values.password.trim() ? { password: values.password.trim() } : {}),
              }
            : {
                username: values.username.trim(),
                password: values.password.trim(),
                rol: values.rol,
              },
        ),
      });
      const data = (await res.json()) as { error?: string; detalles?: string[] };
      if (!res.ok) {
        throw new Error(data.detalles?.join(", ") ?? data.error ?? "No se pudo guardar");
      }
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  if (!isStaff) return null;

  const actorRol = session?.rol as StaffRol | undefined;

  const rolOptions: StaffRol[] = ["SUPERVISOR", "ASISTENCIA", "CONVOCATORIA", "COORDINADOR", "ADMIN"];

  const initialValues: FormValues = editing
    ? {
        username: editing.username,
        password: "",
        rol: editing.rol,
        activo: editing.activo,
      }
    : emptyForm();

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">
            {loading
              ? "Cargando…"
              : `${usuarios.length} cuenta(s) · Administradores, supervisores y roles operativos`}
          </p>
        </div>
        <button type="button" className="btn-primary btn-responsive" onClick={openCreate}>
          Nuevo usuario
        </button>
      </div>

      {error ? <div className="alert-error">{error}</div> : null}

      {loading ? (
        <div className="flex items-center gap-3 text-ink-secondary">
          <span className="size-5 animate-pulse rounded-full bg-pin-light" />
          Cargando usuarios…
        </div>
      ) : null}

      {!loading ? (
        <TableWrap>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Contraseña</th>
                <th className="w-28">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.username}</td>
                  <td>
                    <span className="badge-pin">{STAFF_ROL_LABEL[u.rol]}</span>
                  </td>
                  <td>
                    {u.activo ? (
                      <span className="badge-muted">Activo</span>
                    ) : (
                      <span className="badge-muted opacity-60">Inactivo</span>
                    )}
                  </td>
                  <td className="font-mono text-sm text-ink-secondary">{u.password ?? "—"}</td>
                  <td>
                    {puedeEditarUsuarioStaff(actorRol, u.rol) ? (
                      <button type="button" className="btn-ghost btn-sm" onClick={() => openEdit(u)}>
                        Editar
                      </button>
                    ) : (
                      <span className="text-xs text-ink-secondary">Sin permiso</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : null}

      {modalOpen ? (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="modal-panel max-w-md"
            role="dialog"
            aria-labelledby="usuario-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="usuario-modal-title" className="text-lg font-bold text-ink">
              {editing ? "Editar usuario" : "Nuevo usuario"}
            </h2>
            <p className="mt-1 text-sm text-ink-secondary">
              {editing
                ? "Actualiza credenciales o estado. Deja la contraseña vacía para no cambiarla."
                : "Crea una cuenta de administrador, supervisor o rol operativo limitado."}
            </p>

            <Formik
              initialValues={initialValues}
              validationSchema={editing ? editSchema : createSchema}
              enableReinitialize
              onSubmit={(values) => void handleSubmit(values)}
            >
              {({ errors, touched, values, setFieldValue }) => (
                <Form className="mt-6 space-y-4">
                  <div>
                    <label className="label" htmlFor="username">
                      Usuario
                    </label>
                    <Field id="username" name="username" className="input" autoComplete="off" />
                    {errors.username && touched.username ? (
                      <p className="field-error">{errors.username}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="label" htmlFor="password">
                      Contraseña{editing ? " (opcional)" : ""}
                    </label>
                    <Field
                      id="password"
                      name="password"
                      type="text"
                      className="input"
                      autoComplete="new-password"
                      placeholder={editing ? "Sin cambios" : "Mínimo 6 caracteres"}
                    />
                    {errors.password && touched.password ? (
                      <p className="field-error">{errors.password}</p>
                    ) : null}
                  </div>

                  <div>
                    <label className="label" htmlFor="rol">
                      Rol
                    </label>
                    <Field
                      as="select"
                      id="rol"
                      name="rol"
                      className="input"
                      disabled={editing?.id === session?.id || (editing ? !puedeEditarUsuarioStaff(actorRol, editing.rol) : false)}
                    >
                      {rolOptions
                        .filter((rol) => puedeAsignarRolStaff(actorRol, rol))
                        .map((rol) => (
                          <option key={rol} value={rol}>
                            {STAFF_ROL_LABEL[rol]}
                          </option>
                        ))}
                    </Field>
                  </div>

                  {editing ? (
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        checked={values.activo}
                        disabled={
                          editing.id === session?.id ||
                          !puedeDarDeBajaUsuarioStaff(actorRol, editing.rol)
                        }
                        onChange={(e) => void setFieldValue("activo", e.target.checked)}
                      />
                      Cuenta activa
                    </label>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <button type="button" className="btn-ghost" onClick={closeModal} disabled={saving}>
                      Cancelar
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear usuario"}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      ) : null}
    </div>
  );
}
