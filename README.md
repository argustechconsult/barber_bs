# MÓDULOS

- AUTH - Signup, Login, Logout ✅
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
    - Login com o Google - **PRECISA CADASTRAR CARTÃO DO CLIENTE**
- Logout
    - Remoção de sessão



## AGENDA

- Agenda de barbeiros ✅
    - Listagem de barbeiros
    - Agenda de barbeiros
    - Agenda de clientes

- Agenda de clientes ✅
    - Listagem de clientes
    - Agenda de clientes

* webhook no n8n para envio de email de agendamento + mensagem wpp com a confirmação do agendamento.❌
    - serviço de lembrete de agendamento no dia do agendamento.❌



## PAGAMENTOS
USUARIO **START** ✅
- Pagamento com cartão de crédito - STRIPE
- Pagamento com débito - STRIPE
- Pagamento com PIX - ABACATEPAY
    - OBS ABACATEPAY OU STRIPE

USUARIO **PREMIUM**
- Pagamento com cartão de crédito
    - OBS STRIPE (**Pagamento Mensal**)


* verificar tabela do pagamento no DB - (produto,servico,plano,usuario,id_usuario,data_vencimento,status_pagamento)✅
    - status_pagamento: PENDENTE, PAGO, CANCELADO. ✅
    - O stripe tenta verificar o pagamento durante sete dias,após isso o status é atualizado para CANCELADO. E o cliente não usa mais o serviço
* produtos,serviços e planos cadastrados no banco devem refletir no stripe ✅

OBS: Comando para criar produtos no stripe: npx tsx scripts/test-stripe-sync.ts

# DADOS DE ACESSO

versel:
login: argustechbs@gmail.com
senha: argustechbs123
LOCALWEB:
login: jon5506
senha: Hap@2025
VPS:
login: root
senha: Hap@2025
IP:191.252.102.247


# USUÁRIOS PADRÃO (MOCK & SEED)

## Barbeiro Administrador

- **Login:** admin@email.com
- **Senha:** admin

## Barbeiro Premium

- **Login:** joao@email.com
- **Senha:** 123456

## Usuário Start

- **Login:** start@email.com
- **Senha:** start

## Usuário Premium

- **Login:** premium@email.com
- **Senha:** premium

# FEATURES

- PRISMA
- NEON
- VERCEL
- STRIPE


Atualizei e executei o script de seed (prisma/seed.ts) com sucesso. Agora o banco contém:

Usuários: Admin (admin), Barbeiro (Jorge), Start (start), Premium (premium).
Serviços: Corte, Barba, Combo, Acabamento.
Produtos: Pomada, Óleo, Shampoo.


# TODO

- corrigir routes ✅
- logica pagamento premium mensal - ✅ **terminar testes**
- criar webhook para mudar status do pagamento NO STRIPE
- criar área financeiro do PREMIUM
