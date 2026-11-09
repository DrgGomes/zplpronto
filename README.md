# ZPLPronto — MVP publicável (beta)

## Estado real
Conversão ZPL→PDF, prévia e impressão no navegador, com limite de 100 etiquetas por operação. Presets 80×50, 100×150, 100×100 e 50×30 mm. Landing page com planos e placeholders de anúncio.

**Ainda não existem:** login, pagamentos, assinaturas, armazenamento em nuvem, conversão para outros formatos e conversão em lote PRO. Os botões de conta/PRO abrem aviso de desenvolvimento, não fingem oferecer pagamento funcional.

## Hospedar na Vercel
1. Criar projeto na Vercel via importação de repositório GitHub contendo estes arquivos (na raiz).
2. Framework: Other; build: none; output: raiz.
3. Publicar; testar no URL *.vercel.app.
4. Escolher/comprar domínio depois de verificar registro e marcas; configurar DNS conforme mostrado na Vercel.
5. Só vincular anúncios depois de aprovação na rede e política de privacidade detalhada.

## Próxima etapa de desenvolvimento
- Supabase Auth e tabelas (accounts, print_presets, label_files, entitlements); Storage privado com RLS por usuário; limite 100MB.
- Mercado Pago Checkout Pro + webhook com validação de assinatura de notificação, idempotência e validação do pagamento via API antes de habilitar acesso. Nada de segredo de pagamentos no navegador.
- Recursos PRO: lotes acima de 100 (restrição por recursos do navegador), pré-ajustes salvos, biblioteca, PNG / SVG dependendo do suporte técnico.
- Auditoria de renderização de ZPL e testes com impressão e leitura de código de barras antes de produção Mercado Livre Full.
- Inserir página de Termos, suporte, política de privacidade/LGPD e consentimento de cookies para anúncios.

## Limitação crítica
Interpretador ZPL parcial. Code128 somente subset B, campos ^FH, texto, ^FB, ^PQ e alguns outros. QR, imagens ^GFA, fontes especiais e vários comandos avançados não são suportados. Não afirmar 100% de fidelidade. Impressão via diálogo do navegador depende das preferências do driver.
