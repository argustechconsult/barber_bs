# MÓDULOS

- AUTH - Signup, Login, Logout
- AGENDA - Agenda de barbeiros
- PAGAMENTOS - Pagamento com cartão de crédito / PIX
- MARKETPLACE - Produtos

## AUTH

- Signup
    - Criação de usuário   
    - Criação de sessão com JWT
- Login
    - Validação de usuário
    - Criação de sessão com JWT
    - Login com o Google
- Logout
    - Remoção de sessão



## AGENDA

- Agenda de barbeiros
    - Listagem de barbeiros
    - Agenda de barbeiros
    - Agenda de clientes

- Agenda de clientes
    - Listagem de clientes
    - Agenda de clientes



## PAGAMENTOS

- Stripe
    - Pagamento com cartão de crédito
    - Pagamento com débito
    - Pagamento com PIX
* verificar tabela do pagamento no DB - (produto,servico,plano,usuario,id_usuario,data_vencimento)

# DADOS DE ACESSO

versel:
login: argustechbs@gmail.com
senha: argustechbs123

# USUÁRIOS PADRÃO (MOCK & SEED)

## Barbeiro Administrador

- **Login:** admin
- **Senha:** admin

## Usuário Start

- **Login:** start
- **Senha:** start

## Usuário Premium

- **Login:** premium
- **Senha:** premium

# TUTORIAL PRISMA & NEON

O projeto foi configurado para integrar com o Neon via Prisma.

## Setup Inicial

1. Instale as dependências: `npm install`
2. Gere o cliente Prisma: `npx prisma generate`

## Banco de Dados

Para sincronizar o esquema com o banco de dados Neon e rodar os seeds (popular usuários padrão):

```bash
npx prisma db push
npx prisma db seed
```

> **Nota:** A URL do banco de dados já foi configurada no arquivo `.env`.

# FEATURES

- PRISMA
- NEON
- VERCEL
- STRIPE