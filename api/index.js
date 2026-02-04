const htmlPdf = require('html-pdf-node');

module.exports = async (req, res) => {
  // GET para status
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'HTML to PDF Converter',
      version: '6.0',
      endpoint: 'POST /api com {html_final: "seu_html"}',
      engine: 'html-pdf-node'
    });
  }

  // Aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    // Parse do body
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { html_final } = body;

    if (!html_final) {
      return res.status(400).json({ error: 'Campo html_final obrigatório' });
    }

    console.log('📦 Iniciando conversão HTML -> PDF');

    // Opções do PDF
    const options = { 
      format: 'A4',
      printBackground: true,
      margin: { 
        top: '20mm', 
        right: '15mm', 
        bottom: '20mm', 
        left: '15mm' 
      },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    // Arquivo HTML
    const file = { content: html_final };

    console.log('📝 Gerando PDF...');
    const pdfBuffer = await htmlPdf.generatePdf(file, options);

    console.log('✅ PDF gerado:', pdfBuffer.length, 'bytes');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('❌ Stack:', error.stack);

    return res.status(500).json({
      error: 'Falha ao gerar PDF',
      details: error.message
    });
  }
};