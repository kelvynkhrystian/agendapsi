export interface InformationPageDefault {
  id: "terms" | "privacy" | "lgpd" | "ethics";
  title: string;
  description: string;
  publicSlug: string;
  alternateSlug: string;
  version: string;
  contentHtml: string;
}

export const INFORMATION_PAGES_DEFAULTS: Record<string, InformationPageDefault> = {
  terms: {
    id: "terms",
    title: "Termos de Uso",
    description: "Condições gerais de navegação, solicitação de consultas e uso da plataforma do consultório.",
    publicSlug: "/termos-de-uso",
    alternateSlug: "/termos",
    version: "1.0",
    contentHtml: `
<h2>1. Finalidade do Site e da Plataforma</h2>
<p>Este ambiente digital pertence ao consultório profissional e destina-se à apresentação de serviços de saúde mental, informações institucionais e agendamento de consultas psicológicas e psiquiátricas presenciais ou online.</p>
<p>A simples navegação pelo site não estabelece vínculo terapêutico imediato nem substitui uma avaliação diagnóstica presencial ou teleconsulta individualizada.</p>

<h2>2. Agendamento e Reservas de Horários</h2>
<p>O agendamento de consultas é realizado em etapas transparentes:</p>
<ul>
  <li><strong>Reserva Temporária:</strong> Ao selecionar uma data e horário disponíveis, o sistema garante uma reserva temporária de 15 minutos para que o paciente preencha seus dados de identificação e escolha a forma de pagamento.</li>
  <li><strong>Confirmação de Agendamento:</strong> O agendamento torna-se efetivo após a validação cadastral e a conformidade com a política de confirmação do consultório.</li>
  <li><strong>Menores de Idade:</strong> O agendamento para crianças e adolescentes requer expressamente o fornecimento do nome, CPF e telefone de contato de pelo menos um responsável legal, nos termos do Estatuto da Criança e do Adolescente (ECA) e das resoluções do Conselho Federal de Psicologia.</li>
</ul>

<h2>3. Responsabilidades do Usuário</h2>
<p>Ao utilizar os formulários e a área do paciente, o usuário compromete-se a:</p>
<ul>
  <li>Fornecer dados cadastrais verídicos, exatos e atualizados.</li>
  <li>Manter a confidencialidade de suas credenciais de acesso ao Painel do Paciente.</li>
  <li>Comparecer pontualmente às sessões agendadas ou avisar com a antecedência necessária.</li>
</ul>

<h2>4. Política de Cancelamento e Remarcação</h2>
<p>Para resguardar a disponibilidade da agenda e o respeito aos demais pacientes, cancelamentos ou remarcações devem ser comunicados com antecedência mínima de 3 dias úteis (conforme as diretrizes do contrato terapêutico). Cancelamentos fora desse prazo impedem o remanejamento do horário e poderão ensejar a cobrança da sessão reservada.</p>

<h2>5. Teleconsultas e Atendimento Virtual</h2>
<p>As sessões virtuais ocorrem por meio de ambiente criptografado, acessível pelo link único enviado ao paciente. O acesso à sala de espera virtual é liberado 15 minutos antes do horário marcado. É de responsabilidade do paciente assegurar um ambiente privado e silencioso com conexão estável à internet.</p>

<h2>6. Contato e Esclarecimento de Dúvidas</h2>
<p>Para dúvidas sobre estes termos ou solicitações de agendamento, entre em contato diretamente pelos canais oficiais de telefone, WhatsApp ou e-mail disponibilizados no rodapé do consultório.</p>
`.trim(),
  },

  privacy: {
    id: "privacy",
    title: "Política de Privacidade",
    description: "Tratamento de dados pessoais, sigilo ético de prontuários, retenção e uso de cookies essenciais.",
    publicSlug: "/politica-de-privacidade",
    alternateSlug: "/privacidade",
    version: "1.0",
    contentHtml: `
<h2>1. Compromisso com a Privacidade e Sigilo Clínico</h2>
<p>Nosso consultório está comprometido com a proteção dos dados pessoais de seus pacientes e visitantes, em estrita observância à Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018), ao Código de Ética Profissional do Psicólogo e às resoluções dos Conselhos de Saúde.</p>

<h2>2. Dados Pessoais Coletados e Finalidades</h2>
<p>Coletamos estritamente os dados necessários para o atendimento e a gestão clínica:</p>
<ul>
  <li><strong>Identificação e Contato:</strong> Nome completo, e-mail, telefone/WhatsApp, CPF, data de nascimento e endereço residencial (utilizados para cadastro, autenticação segura, envio de lembretes e emissão de recibos/laudos).</li>
  <li><strong>Dados de Responsáveis Legais:</strong> No caso de pacientes menores de 18 anos, são coletados nome, CPF, parentesco e contato do responsável legal para fins de consentimento obrigatório.</li>
  <li><strong>Prontuários e Anotações de Evolução Clínica:</strong> Informações de saúde mental e evolução clínica são confidenciais e registradas de forma privativa e segura. O acesso a essas notas é <em>exclusivo do profissional titular</em>, não sendo visíveis nem mesmo na área pública do paciente.</li>
  <li><strong>Histórico Financeiro e Agendamentos:</strong> Registro de consultas realizadas, pacotes contratados e status de confirmação de pagamento.</li>
</ul>

<h2>3. Bases Legais para o Tratamento (LGPD)</h2>
<p>O tratamento de dados é respaldado pelas seguintes hipóteses legais:</p>
<ul>
  <li><strong>Tutela da Saúde:</strong> Procedimento realizado por profissional de saúde devidamente habilitado (Art. 7º, VIII e Art. 11, II, 'f' da LGPD).</li>
  <li><strong>Execução de Contrato:</strong> Prestação dos serviços terapêuticos contratados pelo paciente (Art. 7º, V da LGPD).</li>
  <li><strong>Cumprimento de Obrigação Legal e Regulatória:</strong> Guarda obrigatória de prontuários médicos e psicológicos pelo período mínimo legal de 5 anos (Resolução CFP nº 01/2009 e normas correlatas).</li>
</ul>

<h2>4. Compartilhamento e Sigilo</h2>
<p><strong>Nenhum dado clínico é comercializado ou compartilhado com terceiros para fins de marketing ou publicidade.</strong> O compartilhamento ocorre apenas quando expressamente autorizado pelo paciente (ex: laudos ou relatórios com link privado de download com senha e prazo de validade) ou por determinação judicial fundamentada.</p>

<h2>5. Uso de Cookies e Armazenamento Local</h2>
<p id="cookies">Nosso site utiliza apenas recursos estritamente necessários para a operação segura:</p>
<ul>
  <li><strong>Cookies Essenciais de Sessão:</strong> Cookie criptografado HTTP-only (<code>psi_auth_token</code>) para manter a sessão do usuário autenticada com segurança.</li>
  <li><strong>Preferências Visuais:</strong> Chaves de armazenamento local (<code>localStorage</code>) para salvar sua escolha de modo visual claro ou escuro e a sua decisão sobre cookies.</li>
  <li><strong>Ausência de Rastreamento Invasivo:</strong> Não carregamos scripts de espionagem comportamental ou pixels invasivos de publicidade direcionada.</li>
</ul>

<h2>6. Direitos do Titular de Dados</h2>
<p>Você pode solicitar a qualquer momento a confirmação da existência de tratamento, a correção de dados cadastrais incorretos e informações sobre como seus dados são guardados. Solicitações devem ser encaminhadas ao canal de atendimento do consultório.</p>
`.trim(),
  },

  lgpd: {
    id: "lgpd",
    title: "Proteção de Dados (LGPD)",
    description: "Informações sobre a Lei Geral de Proteção de Dados (Lei 13.709/2018) e canal de atendimento aos titulares.",
    publicSlug: "/protecao-de-dados",
    alternateSlug: "/lgpd",
    version: "1.0",
    contentHtml: `
<h2>1. O que é a LGPD?</h2>
<p>A Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) estabelece diretrizes para a coleta, o armazenamento, o tratamento e o compartilhamento de dados pessoais, assegurando a privacidade, a transparência e a autodeterminação informativa de todas as pessoas físicas.</p>

<h2>2. Como o Consultório Protege suas Informações</h2>
<p>Nosso consultório adota medidas técnicas e administrativas rigorosas para garantir a segurança e o sigilo de seus dados:</p>
<ul>
  <li><strong>Instalação Standalone Isolada:</strong> O sistema opera em banco de dados isolado e diretório privado, garantindo que suas informações não fiquem expostas em bancos de dados compartilhados com outros profissionais.</li>
  <li><strong>Sigilo Clínico Absoluto:</strong> As evoluções clínicas de sessão e os registros de prontuário são mantidos sob guarda privativa do profissional, sob o manto do sigilo ético inviolável.</li>
  <li><strong>Trilha de Auditoria:</strong> Acessos e atualizações cadastrais são registrados em log seguro para garantir rastreabilidade e integridade.</li>
</ul>

<h2>3. Direitos dos Titulares de Dados</h2>
<p>Conforme previsto no Artigo 18 da LGPD, você possui os seguintes direitos em relação aos seus dados pessoais:</p>
<ul>
  <li><strong>Confirmação e Acesso:</strong> Direito de confirmar a existência de tratamento e acessar os dados cadastrais mantidos.</li>
  <li><strong>Correção:</strong> Direito de solicitar a correção imediata de dados incompletos, inexatos ou desatualizados.</li>
  <li><strong>Informação sobre Compartilhamento:</strong> Saber com quais entidades ou instituições eventuais compartilhamentos são realizados (ex: provedores de processamento de pagamento ou plataformas de teleconsulta).</li>
  <li><strong>Portabilidade e Revogação:</strong> Solicitar a transferência de seus dados ou a revogação de consentimentos não obrigatórios, observadas as exigências legais de guarda temporal mínima de prontuários (5 anos conforme Resolução CFP nº 01/2009).</li>
</ul>

<h2>4. Canal de Atendimento ao Titular</h2>
<p>Para exercer qualquer um de seus direitos ou esclarecer dúvidas sobre a nossa governança de dados, você pode entrar em contato diretamente com o profissional titular e responsável pelo tratamento através do e-mail oficial informado no rodapé desta página.</p>
`.trim(),
  },

  ethics: {
    id: "ethics",
    title: "Ética Profissional",
    description: "Compromisso ético, sigilo profissional e conformidade com o Código de Ética Profissional do Psicólogo (CFP).",
    publicSlug: "/etica-profissional",
    alternateSlug: "/etica-profissional",
    version: "1.0",
    contentHtml: `
<h2>1. Compromisso Ético e Responsabilidade Profissional</h2>
<p>A prática clínica deste consultório é fundamentada no compromisso irrestrito com a dignidade humana, o respeito à liberdade, a promoção da saúde e o cumprimento rigoroso dos preceitos éticos e técnico-científicos estabelecidos pelos órgãos reguladores da profissão.</p>

<h2>2. O Código de Ética Profissional</h2>
<p>No exercício da psicologia clínica, a atuação profissional orienta-se integralmente pelos princípios do <strong>Código de Ética Profissional do Psicólogo</strong> (Resolução CFP nº 010/2005), destacando-se:</p>
<ul>
  <li><strong>Respeito à Dignidade e Integridade:</strong> O profissional trabalhará visando promover a saúde e a qualidade de vida das pessoas e das coletividades, atuando contra quaisquer formas de discriminação, preconceito, exploração ou violência.</li>
  <li><strong>Sigilo Profissional Absoluto (Art. 9º):</strong> O psicólogo protegerá, por meio da confidencialidade, a intimidade das pessoas, grupos ou organizações a que tenha acesso no exercício profissional. Informações compartilhadas durante as sessões jamais serão divulgadas a terceiros sem autorização formal.</li>
  <li><strong>Aprimoramento Contínuo:</strong> Compromisso constante com a atualização técnica, científica e teórica no campo da psicologia.</li>
  <li><strong>Consentimento e Relação Terapêutica:</strong> Transparência nos objetivos do tratamento, na frequência das sessões, no valor dos honorários e nas condições de atendimento.</li>
</ul>

<h2>3. Atendimento de Crianças e Adolescentes</h2>
<p>O atendimento a menores de 18 anos obedece estritamente às normas do Estatuto da Criança e do Adolescente (Lei nº 8.069/1990) e às resoluções do CFP, exigindo a prévia autorização e o envolvimento responsável de pais ou tutores legais, resguardando simultaneamente o espaço ético de confidencialidade com o paciente.</p>

<h2>4. Acesso ao Código de Ética Oficial</h2>
<p>Para consultar a íntegra oficial das normas e resoluções que regem o exercício profissional da psicologia no Brasil, acesse o portal do Conselho Federal de Psicologia:</p>
<p><a href="https://site.cfp.org.br/legislacao/codigo-de-etica/" target="_blank" rel="noopener noreferrer">Conselho Federal de Psicologia — Código de Ética Profissional do Psicólogo (CFP)</a></p>

<h2>5. Informações e Contato</h2>
<p>O profissional responsável por este consultório encontra-se devidamente registrado e ativo perante o respectivo Conselho Regional de Psicologia (CRP). Informações adicionais sobre o registro profissional podem ser solicitadas diretamente através dos canais de contato disponíveis no site.</p>
`.trim(),
  },
};
