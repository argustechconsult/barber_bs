# MÓDULOS

- AUTH
    - Signup ✅
    - Login ✅
    - Logout ✅
    - Reset Password ⚠️
- AGENDA ✅ - VALIDAR EM PROD
    - Agenda de barbeiros ✅
    - Agenda de Clientes ✅
- PAGAMENTOS ⚠️
    - START (ÚNICO) ✅
        - Crédito ✅
        - Débito ✅
        - PIX ✅
    - PREMIUM (RECORRENTE) ⚠️
        - Crédito ⚠️
        - Débito ⚠️
        - PIX
- MARKETPLACE ⚠️
    - Barbeiro ⚠️
        - CRUD feito apenas pelo barbeiro administrador
    - Cliente ⚠️
        - Fluxo de compra de produtos
- FINANCEIRO ⚠️
    - Barbeiro ⚠️
        - Administrador ⚠️
            - Visualiza todos os ganhos ⚠️
            - lança receita e despesas ⚠️
        - Barbeiro ⚠️
            - Visualiza seus ganhos ⚠️
    - Cliente ⚠️
        - Start ⚠️
            - Visualiza seus ultimos gastos ⚠️
        - Premium ⚠️
            - Visualiza suas ultimas mensalidades ⚠️
CONFIGURAÇÃO ⚠️
    - Barbeiro ⚠️
        - Administrador ⚠️
            - Altera nome ⚠️
            - Altera Foto ⚠️
            - Intervalo de tempo entre cortes ⚠️
            - Datas que irá atender ⚠️
            - Cadastra barbeiros ⚠️
            - Cadastra serviços ⚠️
            - Cadastra produtos ⚠️
            - Cadastra planos ⚠️
        - Barbeiro ⚠️
            - Altera nome ⚠️
            - Altera Foto ⚠️
    - Cliente
        - Start⚠️
            - Altera nome ⚠️
            - Altera Foto ⚠️
        - Premium ⚠️
            - Altera nome ⚠️
            - Altera Foto ⚠️

## AUTH ✅

- Signup
    **Cliente**
    - Criação de usuário   ✅
    - Criação de sessão com JWT ✅
    - Login com o Google - **PRECISA CADASTRAR CARTÃO DO CLIENTE**
    **Barbeiro**
    - Recebe o link criado pelo Barbeiro Administrador ✅
- Login
    **Cliente**
    - Validação de usuário ✅
    - Criação de sessão com JWT ✅
    - Login com o Google - **PRECISA CADASTRAR CARTÃO DO CLIENTE**
    **Barbeiro**
    - Loga após a criação do barbeiro via link ✅
- Logout
    - Remoção de sessão ✅

## AGENDA ⚠️

- Agenda de barbeiros ✅
    - Listagem de barbeiros
    - Agenda de barbeiros
    - Agenda de clientes

- Agenda de clientes ✅
    - Listagem de clientes
    - Agenda de clientes

* webhook no n8n para envio de email de agendamento + mensagem wpp com a confirmação do agendamento.❌
    - serviço de lembrete de agendamento no dia do agendamento.❌



## PAGAMENTOS ⚠️
USUARIO **START** ⚠️
- Pagamento com cartão de crédito - INFINITYPAY
- Pagamento com débito - INFINITYPAY
- Pagamento com PIX - INFINITYPAY
    - OBS INFINITYPAY

USUARIO **PREMIUM**⚠️
- Pagamento com cartão de crédito - INFINITYPAY
OBS: não gera pagamento mensal * criar lógica


* verificar tabela do pagamento no DB - (produto,servico,plano,usuario,id_usuario,data_vencimento,status_pagamento)✅
    - status_pagamento: PENDENTE, PAGO, CANCELADO. ✅
    - O stripe tenta verificar o pagamento durante sete dias,após isso o status é atualizado para CANCELADO. E o cliente não usa mais o serviço
* produtos,serviços e planos cadastrados no banco devem refletir no stripe ✅

OBS: REFATORAR DE ACORDO COM https://www.infinitepay.io/checkout#codeSetupBlock

video referencia:https://www.youtube.com/watch?v=zJrbLAHYvaY&t=30s

* tem que enviar os dados do cliente para o infinitepay
* Gerar uma tela unica de pagamento para todos os pagamentos
* criar tela de sucesso de pagamento + tela de pagamento cancelado
* converter valor em centavos antes de enviar para o infinitepay
0º enviar dados do cliente para o infinitepay
"customer": {
  "name": "João Silva",
  "email": "joao@email.com",
  "phone_number": "+5511999887766"
}
1º criar pagamento no banco de dados e vinculando o id do pagamento no order_nsu
2º criar webhook no infinitepay para atualizar o status do pagamento
3º enviar e armazenar reicpt_url para o whatsapp do cliente
4º armazenar o transaction_nsu do infinitepay no banco de dados para futuras consultas

## MARKETPLACE ⚠️
 - marketplace - barbeiro ✅
 - marketplace - Cliente ⚠️

## NOVO BARBEIRO ✅
- Barbeiro admin cria o barbeiro, gera o link de convite e envia para o o barbeiro ✅






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

- **Login:** novo@barbeiro.com
- **Senha:** 123456

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
- Marketplace - cliente
- criar área financeiro do PREMIUM
- verificar agendamento selecionado pelo barbeiro ⚠️
- testar pagamentos no infinitepay com 1 real
