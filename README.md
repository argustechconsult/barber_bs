# TODO

- implementar pagamento com cartão de crédito
- envio de mensagem whatsapp
- colocar logo

# Regras de negócio

-

# Telas criadas

- Login ok
- Cadastro ok
- Integração com neon ok
- Implementação de autenticação ok
- Implementação de JWT - SERÁ FEITO NO FINAL
- Agenda ok
    - Agenda de barbeiros
- Marketplace ok
    - Criar cada card dos produtos
    - criar seed de produtos

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
