

## Plano: Dar Poderes de Root ao Admin (Criar, Excluir Usuários)

### Contexto Atual

Atualmente, apenas o usuário **root** pode criar novos usuários. O admin pode gerenciar equipes, papéis e dados, mas **nao pode criar nem excluir** usuários. Precisamos mudar isso.

### Mudancas Necessarias

---

### 1. Atualizar `useAuth.ts` - Permissoes do Admin

**Arquivo:** `src/hooks/useAuth.ts`

Alterar `canManageUsers` para incluir admin:

```text
// DE:
canManageUsers: role === 'root',

// PARA:
canManageUsers: role === 'root' || role === 'admin',
```

---

### 2. Atualizar Edge Function `create-user` - Aceitar Admin

**Arquivo:** `supabase/functions/create-user/index.ts`

Tres mudancas:

**2.1** Verificacao de permissao - aceitar admin alem de root:
```text
// DE:
if (roleError || roleData?.role !== 'root') {
  // erro: Only root users can create new users

// PARA:
if (roleError || !['root', 'admin'].includes(roleData?.role)) {
  // erro: Only root or admin users can create new users
```

**2.2** Interface de roles aceitas - incluir 'lider':
```text
// DE:
role: 'member' | 'admin';
// Validacao: if (!['member', 'admin'].includes(role))

// PARA:
role: 'member' | 'lider' | 'admin';
// Validacao: if (!['member', 'lider', 'admin'].includes(role))
```

---

### 3. Criar Edge Function `delete-user`

**Novo arquivo:** `supabase/functions/delete-user/index.ts`

Funcionalidade:
- Recebe `user_id` no body da requisicao
- Verifica se o chamador e root ou admin
- Impede que admin exclua outro admin ou root
- Impede que root exclua a si mesmo
- Usa `adminClient.auth.admin.deleteUser(userId)` para remover o usuario
- A exclusao em cascata (ON DELETE CASCADE) remove automaticamente: profile, user_roles, user_daily_data, etc.

```text
Fluxo:
1. Verificar autenticacao
2. Verificar que chamador e root ou admin
3. Verificar que usuario-alvo nao e root
4. Se chamador e admin, verificar que alvo nao e admin
5. Deletar via Supabase Auth Admin API
6. Retornar sucesso
```

---

### 4. Atualizar `AdminUserTable.tsx` - Adicionar Botao Excluir

**Arquivo:** `src/components/AdminUserTable.tsx`

Mudancas:
- Receber nova prop `canManageUsers` (booleano)
- Adicionar item "Excluir Usuario" no dropdown de acoes (icone Trash2, cor vermelha)
- Mostrar botao apenas para usuarios que podem ser excluidos (nao-root, e se admin nao pode excluir outro admin)
- Ao clicar, abrir dialogo de confirmacao pedindo digitar "CONFIRMAR"
- Ao confirmar, chamar edge function `delete-user`

---

### 5. Atualizar `AdminPanel.tsx` - Remover Restricao do Botao Criar

**Arquivo:** `src/pages/AdminPanel.tsx`

Mudanca simples: remover a condicao `canManageUsers` que esconde o botao "Criar Usuario", ja que agora `canManageUsers` inclui admin.

Nenhuma mudanca estrutural necessaria, pois `canManageUsers` ja e usado corretamente - so precisou ser atualizado no hook.

---

### 6. Atualizar `CreateUserModal.tsx` - Texto Descritivo

**Arquivo:** `src/components/CreateUserModal.tsx`

Atualizar texto da descricao do modal:
```text
// DE:
"Crie uma nova conta de usuario para o sistema. Apenas usuarios root podem fazer isso."

// PARA:
"Crie uma nova conta de usuario para o sistema."
```

---

### 7. Atualizar `AdminUserTable.tsx` - Permitir Admin Editar Roles

**Arquivo:** `src/components/AdminUserTable.tsx`

Atualmente so root pode editar roles. Mudar para admin tambem poder:

```text
// DE:
const canEditRole = isRoot && !isUserRoot;

// PARA:
const canEditRole = !isUserRoot; // Admins e root podem editar (ambos tem acesso ao painel)
```

Nota: admin nao podera promover para root (opcao nao existe no select).

---

### Resumo de Permissoes Apos Mudancas

| Acao | Root | Admin | Lider | Membro |
|------|------|-------|-------|--------|
| Criar usuario | Sim | Sim | Nao | Nao |
| Excluir usuario | Sim (qualquer) | Sim (membros e lideres) | Nao | Nao |
| Editar roles | Sim | Sim (exceto root) | Nao | Nao |
| Zerar pontuacao | Sim | Sim | Nao | Nao |
| Desbloquear registros | Sim | Sim | Nao | Nao |

---

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/useAuth.ts` | Modificar | `canManageUsers` inclui admin |
| `supabase/functions/create-user/index.ts` | Modificar | Aceitar admin como criador + aceitar role 'lider' |
| `supabase/functions/delete-user/index.ts` | Criar | Nova edge function para excluir usuarios |
| `src/components/AdminUserTable.tsx` | Modificar | Botao excluir + admin pode editar roles |
| `src/components/CreateUserModal.tsx` | Modificar | Atualizar texto descritivo |
| `src/pages/AdminPanel.tsx` | Modificar | Nenhuma mudanca estrutural (ja funciona com `canManageUsers` atualizado) |

---

### Seguranca

- A validacao de permissao e feita no **backend** (edge function), nao apenas no frontend
- Admin nao pode excluir outro admin ou root (protecao no backend)
- Admin nao pode se auto-promover a root (opcao nao existe)
- Todas as exclusoes usam a API administrativa do Supabase Auth, garantindo limpeza completa

