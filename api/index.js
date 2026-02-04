const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async (req, res) => {
  // GET para status
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'HTML to PDF Converter',
      version: '4.0',
      endpoint: 'POST /api com {html_final: "seu_html"}',
      chromium: '126.0.0'
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

    // Lançar browser com configuração Vercel otimizada
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-sandbox',
        '--single-process'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true
    });

    const page = await browser.newPage();

    console.log('📄 Carregando conteúdo...');
    await page.setContent(html_final, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

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
    console.error('❌ Stack:', error.stack);
    
    if (browser) {
      await browser.close().catch(() => {});
    }

    return res.status(500).json({
      error: 'Falha ao gerar PDF',
      details: error.message,
      stack: error.stack
    });
  }
};