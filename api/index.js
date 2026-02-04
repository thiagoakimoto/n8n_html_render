const chromium = require('chrome-aws-lambda');

module.exports = async (req, res) => {
  // GET para status
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'HTML to PDF Converter',
      version: '3.0',
      endpoint: 'POST /api com {html_final: "seu_html"}'
    });
  }

  // Aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  let browser = null;

  try {
    // Parse do body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { html_final } = body;

    if (!html_final) {
      return res.status(400).json({ error: 'Campo html_final obrigatório' });
    }

    console.log('📦 Iniciando conversão HTML -> PDF');

    // chrome-aws-lambda já vem com puppeteer embutido
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless
    });

    const page = await browser.newPage();

    console.log('📄 Carregando conteúdo...');
    await page.setContent(html_final, { waitUntil: 'networkidle0' });

    // Aguarda renderização
    await page.evaluate(() => new Promise(r => setTimeout(r, 1500)));

    console.log('📝 Gerando PDF...');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' }
    });

    await browser.close();
    browser = null;

    console.log('✅ PDF gerado:', pdf.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    return res.status(200).send(pdf);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    
    if (browser) {
      await browser.close().catch(() => {});
    }

    return res.status(500).json({
      error: 'Falha ao gerar PDF',
      details: error.message
    });
  }
};