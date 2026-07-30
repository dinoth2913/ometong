/* ==========================================================================
   Suppliers.js — Ometong (For Suppliers & Manufacturers page)
   Handles: shared site chrome (loader, scroll progress, nav/mobile menu,
   announcement bar, back-to-top, footer year, newsletter) plus page-specific
   behavior: animated stat counters, testimonial slider dots, FAQ accordion,
   and the supplier application (lead) form with client-side validation and
   localStorage persistence.
   ========================================================================== */

(function () {
  "use strict";

  var LEADS_STORAGE_KEY = "ometongSupplierLeads";
  var ANNOUNCE_STORAGE_KEY = "ometongSuppliersAnnounceDismissed";
  var LANG_STORAGE_KEY = "ometong_lang";

  document.addEventListener("DOMContentLoaded", function () {
    initSharedChrome();
    initStatCounters();
    initTestimonialSlider();
    initFaqAccordion();
    initApplyForm();
    initLanguageSwitcher();
  });

  /* ---------------------------------------------------------------------
     Multi-language support
     --------------------------------------------------------------------- */
  var LANG_NAMES = { en: "English", zh: "中文 (简体)", es: "Español", fr: "Français", hi: "हिन्दी", si: "සිංහල" };

  var TRANSLATIONS = {
    en: {
      "announce.text": "✦ Supplier Growth plan — first 3 months at 50% off for new manufacturers",
      "announce.link": "See pricing →",
      "nav.how": "How it Works", "nav.categories": "Categories", "nav.marketplace": "Marketplace",
      "nav.suppliers": "For Suppliers", "nav.advertise": "Advertise", "nav.login": "Login", "nav.becomeSupplier": "Become a Supplier",
      "hero.tag": "✦ For Suppliers & Manufacturers",
      "hero.h1a": "Sell to the world.", "hero.h1b": "Skip the cold outreach.",
      "hero.p": "List once and get matched with buyer requests by AI, get paid through escrow, and let Ometong Market's logistics network handle freight and customs — so you can focus on making and shipping product.",
      "hero.applyBtn": "Apply as a Supplier", "hero.seeHowBtn": "See how it works",
      "hero.trust": "verified suppliers already selling on Ometong",
      "hero.stat1": "Active buyer requests / month", "hero.stat2": "Countries buyers source from",
      "hero.stat3": "% escrow payout success rate", "hero.stat4": "Days avg. time-to-first-order",
      "benefits.tag": "What you get", "benefits.h2": "Built to help suppliers close more deals, faster",
      "benefits.p": "Everything below comes standard — no separate integrations, no extra vendors to manage.",
      "benefits.b1.h": "AI-matched buyer requests",
      "benefits.b1.p": "We show your products directly to buyers already looking for them — you don't compete against thousands of unrelated listings.",
      "benefits.b2.h": "Escrow-secured payouts",
      "benefits.b2.p": "Buyer payment is held safely and paid to you as soon as delivery is confirmed — both sides are protected.",
      "benefits.b3.h": "Logistics handled for you",
      "benefits.b3.p": "Freight booking, customs paperwork, and delivery tracking are arranged by our partner network — you don't need your own export license.",
      "benefits.b4.h": "Verified badge & trust profile",
      "benefits.b4.p": "Verify your business documents once, then keep the badge on every listing — it's the first thing buyers look for.",
      "benefits.b5.h": "Simple sales dashboard",
      "benefits.b5.p": "See which listings are getting views and orders, and where your buyers come from — no extra software to learn.",
      "benefits.b6.h": "Global reach, no new hires",
      "benefits.b6.p": "Sell to buyers in 58+ countries without hiring regional sales staff or opening local offices.",
      "how.tag": "How it Works", "how.h2": "From application to your first order",
      "how.s1.h": "Apply & get verified", "how.s1.p": "Submit your business documents once. Our team checks your company within 2–3 business days.",
      "how.s2.h": "List products & services", "how.s2.p": "Add your products with prices, minimum order amounts, and how long they take to make. The AI tags each one so the right buyers can find it.",
      "how.s3.h": "Get matched & negotiate", "how.s3.p": "Matching buyer requests appear right in your dashboard. Message the buyer, send a quote, and agree the deal — all in one place.",
      "how.s4.h": "Ship & get paid", "how.s4.p": "Hand the order to our logistics partners. Once the buyer confirms it arrived, your payment is released automatically.",
      "mutual.tag": "Why this works for everyone", "mutual.h2": "A marketplace that only grows when you do",
      "mutual.p": "Ometong never buys or stores products, and we don't compete with you for buyers. We only earn money when a real trade happens — through supplier subscriptions and a small fee on escrow-protected orders. So more verified suppliers bring more buyers, more buyers create more matching requests, and better data makes the matching smarter for everyone.",
      "mutual.i1.h": "For suppliers & manufacturers",
      "mutual.i1.p": "Costs less than trade shows or cold outreach, pays you faster through escrow, and a trust badge that speeds up talks with new buyers.",
      "mutual.i2.h": "For Ometong",
      "mutual.i2.p": "Steady subscription and transaction income, and better matching data as both suppliers and buyers grow — all without ever holding any inventory ourselves.",
      "mutual.i3.h": "For buyers",
      "mutual.i3.p": "A faster way to find checked, ready-to-ship suppliers instead of weeks of unanswered messages and unverifiable claims.",
      "pricing.tag": "Pricing", "pricing.h2": "Simple plans for suppliers",
      "pricing.starter.h": "Starter", "pricing.starter.amt": "Free", "pricing.starter.p": "Get verified and list up to 10 products or services.",
      "pricing.starter.f1": "Verified badge", "pricing.starter.f2": "Up to 10 listings", "pricing.starter.f3": "Standard buyer matching", "pricing.starter.btn": "Get Started",
      "pricing.growth.tag": "Most Popular", "pricing.growth.h": "Supplier Growth", "pricing.growth.per": "/mo",
      "pricing.growth.p": "Unlimited listings with priority AI matching.",
      "pricing.growth.f1": "Unlimited listings", "pricing.growth.f2": "Priority placement", "pricing.growth.f3": "Analytics dashboard", "pricing.growth.f4": "Priority escrow payout",
      "pricing.growth.btn": "Start Free Trial",
      "pricing.ent.h": "Enterprise", "pricing.ent.amt": "Custom", "pricing.ent.p": "Dedicated account management and logistics integration.",
      "pricing.ent.f1": "API access", "pricing.ent.f2": "Dedicated manager", "pricing.ent.f3": "Custom contracts", "pricing.ent.btn": "Contact Sales",
      "testi.tag": "From our suppliers", "testi.h2": "What manufacturers say about selling here",
      "faq.tag": "FAQ", "faq.h2": "Common questions from suppliers",
      "faq.q1.q": "How does supplier verification work?",
      "faq.q1.a": "You submit business registration documents, tax ID, and product certificates where relevant. Our team checks and verifies within 2–3 business days, then your profile shows the Verified badge.",
      "faq.q2.q": "How and when do I get paid?",
      "faq.q2.a": "The buyer's payment is held in escrow when they place an order. Once the buyer confirms it arrived (or the confirmation window passes with no dispute), the money is released to your payout account.",
      "faq.q3.q": "What fees does Ometong charge?",
      "faq.q3.a": "Starter is free with a limited number of listings. Supplier Growth is $49/month for unlimited listings and priority matching. A small transaction fee applies on escrow-protected orders — you'll always see the full amount before confirming any plan.",
      "faq.q4.q": "Do I need to arrange my own shipping?",
      "faq.q4.a": "No — you can hand fulfillment to our logistics partner network, which takes care of freight booking, customs paperwork, and tracking. You can also arrange your own shipping if you prefer.",
      "faq.q5.q": "Which countries can I sell to?",
      "faq.q5.a": "Buyers on Ometong currently come from 58+ countries. You choose which regions you're willing to ship to for each listing you create.",
      "apply.tag": "Get Started", "apply.h2": "Apply to become a verified supplier",
      "apply.p": "Tell us a little about your business. Our team reviews applications within 2–3 business days and follows up by email with next steps.",
      "apply.trust1": "No cost to apply", "apply.trust2": "2–3 day review",
      "apply.f.company": "Company name", "apply.f.companyPh": "e.g. Horizon Supply Co.",
      "apply.f.email": "Business email", "apply.f.category": "Primary category", "apply.f.categoryPh": "Select a category",
      "apply.f.cat1": "Electronics", "apply.f.cat2": "Textiles", "apply.f.cat3": "Machinery", "apply.f.cat4": "Food & Beverage",
      "apply.f.cat5": "Construction", "apply.f.cat6": "Packaging", "apply.f.cat7": "Services", "apply.f.cat8": "Logistics",
      "apply.f.details": "Tell us what you make or offer", "apply.f.detailsPh": "Brief description of your products/services and typical order volumes",
      "apply.f.submit": "Submit Application",
      "footer.brand": "The marketplace built for global trade — products, services and logistics, matched by AI.",
      "footer.h1": "Marketplace", "footer.products": "Products", "footer.services": "Services", "footer.suppliers": "Suppliers",
      "footer.h2": "Company", "footer.contact": "Contact",
      "footer.h3": "Stay Updated", "footer.newsletter": "Sourcing tips & platform news, monthly.", "footer.emailPh": "Your email", "footer.join": "Join",
      "footer.rights": "Ometong. All rights reserved.",
      "js.errCompany": "Company name is required.", "js.errEmail": "Enter a valid business email.", "js.errCategory": "Please select a category.",
      "js.errFix": "Please fix the highlighted fields.",
      "js.success": "Application received! Our team will follow up by email within 2–3 business days.",
      "js.subscribed": "Thanks — you're subscribed!"
    },
    zh: {
      "announce.text": "✦ 供应商成长计划 — 新制造商前3个月享5折优惠",
      "announce.link": "查看价格 →",
      "nav.how": "运作方式", "nav.categories": "分类", "nav.marketplace": "市场",
      "nav.suppliers": "供应商专区", "nav.advertise": "广告合作", "nav.login": "登录", "nav.becomeSupplier": "成为供应商",
      "hero.tag": "✦ 面向供应商与制造商",
      "hero.h1a": "把产品卖向全世界。", "hero.h1b": "不用再做陌生开发。",
      "hero.p": "只需上架一次，AI 会自动为您匹配采购需求，货款通过担保交易安全支付，Ometong 的物流网络负责运输和报关 — 您只需专心生产和发货。",
      "hero.applyBtn": "申请成为供应商", "hero.seeHowBtn": "了解运作方式",
      "hero.trust": "位已认证供应商正在 Ometong 上销售",
      "hero.stat1": "每月活跃采购需求", "hero.stat2": "买家来源国家数",
      "hero.stat3": "担保交易成功支付率", "hero.stat4": "平均首单成交天数",
      "benefits.tag": "您将获得", "benefits.h2": "帮助供应商更快成交更多订单",
      "benefits.p": "以下所有功能均为标配 — 无需额外接入其他系统或服务商。",
      "benefits.b1.h": "AI 智能匹配采购需求",
      "benefits.b1.p": "系统会把您的产品直接展示给正在寻找它的买家 — 无需和成千上万条不相关的信息竞争。",
      "benefits.b2.h": "担保交易，安全收款",
      "benefits.b2.p": "买家货款会被安全托管，确认收货后立即打款给您 — 买卖双方都受到保护。",
      "benefits.b3.h": "物流全程代办",
      "benefits.b3.p": "订舱、报关文件、物流跟踪均由合作物流网络处理 — 您无需自己的出口资质。",
      "benefits.b4.h": "认证标志与信任档案",
      "benefits.b4.p": "只需认证一次企业资料，认证标志会显示在您所有的商品信息上 — 这是买家最先关注的信息。",
      "benefits.b5.h": "简单易用的销售看板",
      "benefits.b5.p": "查看哪些商品有浏览量和订单，买家都来自哪里 — 无需学习额外的软件。",
      "benefits.b6.h": "拓展全球市场，无需增加人手",
      "benefits.b6.p": "无需招聘各地区销售团队或开设分支机构，即可把产品卖给58多个国家的买家。",
      "how.tag": "运作方式", "how.h2": "从申请到您的第一笔订单",
      "how.s1.h": "申请并完成认证", "how.s1.p": "只需提交一次企业资料，我们的团队会在2-3个工作日内完成审核。",
      "how.s2.h": "上架产品与服务", "how.s2.p": "填写价格、起订量和生产周期，AI 会为每条信息打上标签，方便匹配到合适的买家。",
      "how.s3.h": "获得匹配并洽谈", "how.s3.p": "匹配的采购需求会直接出现在您的后台。您可以在平台内与买家沟通、报价并达成合作。",
      "how.s4.h": "发货并收款", "how.s4.p": "交给我们的物流合作伙伴处理运输，买家确认收货后，货款会自动放款给您。",
      "mutual.tag": "为什么这对每个人都有利", "mutual.h2": "一个和您共同成长的平台",
      "mutual.p": "Ometong 不采购也不囤积任何商品，也不会和您争夺买家。我们只有在真实交易发生时才会赚取收入 — 通过供应商订阅费和担保交易的少量手续费。这让我们的利益与您一致：更多认证供应商吸引更多买家，更多买家带来更多匹配需求，更多数据也让匹配更加精准。",
      "mutual.i1.h": "对供应商与制造商而言",
      "mutual.i1.p": "获客成本比参展或陌生开发更低，通过担保交易更快收款，信任标志也能加快与新买家的洽谈速度。",
      "mutual.i2.h": "对 Ometong 而言",
      "mutual.i2.p": "获得稳定的订阅和交易收入，随着双方用户增长，匹配数据也不断改善 — 且我们从不承担库存风险。",
      "mutual.i3.h": "对买家而言",
      "mutual.i3.p": "更快找到经过审核、可立即发货的供应商，而不用花几周时间发消息却得不到回复。",
      "pricing.tag": "价格方案", "pricing.h2": "面向供应商的简单方案",
      "pricing.starter.h": "入门版", "pricing.starter.amt": "免费", "pricing.starter.p": "完成认证，最多可上架10件产品或服务。",
      "pricing.starter.f1": "认证标志", "pricing.starter.f2": "最多10条商品信息", "pricing.starter.f3": "标准买家匹配", "pricing.starter.btn": "立即开始",
      "pricing.growth.tag": "最受欢迎", "pricing.growth.h": "供应商成长版", "pricing.growth.per": "/月",
      "pricing.growth.p": "无限量上架商品，享优先 AI 匹配。",
      "pricing.growth.f1": "无限量商品信息", "pricing.growth.f2": "优先展示位置", "pricing.growth.f3": "数据分析看板", "pricing.growth.f4": "优先担保交易放款",
      "pricing.growth.btn": "开始免费试用",
      "pricing.ent.h": "企业版", "pricing.ent.amt": "定制", "pricing.ent.p": "专属客户经理与物流系统对接。",
      "pricing.ent.f1": "API 接入", "pricing.ent.f2": "专属客户经理", "pricing.ent.f3": "定制合同", "pricing.ent.btn": "联系销售",
      "testi.tag": "供应商反馈", "testi.h2": "制造商如何评价在这里销售",
      "faq.tag": "常见问题", "faq.h2": "供应商常见问题",
      "faq.q1.q": "供应商认证是如何运作的？",
      "faq.q1.a": "您需要提交企业注册文件、税号，以及相关产品认证证书。我们的团队会在2-3个工作日内完成审核，之后您的主页会显示认证标志。",
      "faq.q2.q": "我什么时候能收到货款？",
      "faq.q2.a": "买家下单后货款会进入担保账户。买家确认收货后（或确认期结束且无争议），货款会打入您的收款账户。",
      "faq.q3.q": "Ometong 收取哪些费用？",
      "faq.q3.a": "入门版免费，但商品数量有限。供应商成长版为每月49美元，可无限量上架并享优先匹配。担保交易订单会收取少量手续费 — 确认任何方案前都会显示完整金额。",
      "faq.q4.q": "需要我自己安排物流吗？",
      "faq.q4.a": "不需要 — 您可以交给我们的物流合作网络处理，包括订舱、报关文件和物流跟踪。您也可以选择自己安排物流。",
      "faq.q5.q": "我可以卖到哪些国家？",
      "faq.q5.a": "目前 Ometong 的买家来自58多个国家。您可以在创建每条商品信息时选择愿意配送的地区。",
      "apply.tag": "开始申请", "apply.h2": "申请成为认证供应商",
      "apply.p": "简单介绍一下您的企业。我们的团队会在2-3个工作日内审核申请，并通过邮件告知后续步骤。",
      "apply.trust1": "申请免费", "apply.trust2": "2-3天完成审核",
      "apply.f.company": "公司名称", "apply.f.companyPh": "例如：Horizon Supply Co.",
      "apply.f.email": "企业邮箱", "apply.f.category": "主要品类", "apply.f.categoryPh": "请选择品类",
      "apply.f.cat1": "电子产品", "apply.f.cat2": "纺织品", "apply.f.cat3": "机械设备", "apply.f.cat4": "食品饮料",
      "apply.f.cat5": "建筑材料", "apply.f.cat6": "包装", "apply.f.cat7": "服务", "apply.f.cat8": "物流",
      "apply.f.details": "请描述您生产或提供的产品/服务", "apply.f.detailsPh": "简要描述您的产品/服务及常见订单量",
      "apply.f.submit": "提交申请",
      "footer.brand": "为全球贸易打造的平台 — 产品、服务与物流，由 AI 智能匹配。",
      "footer.h1": "市场", "footer.products": "产品", "footer.services": "服务", "footer.suppliers": "供应商",
      "footer.h2": "公司", "footer.contact": "联系我们",
      "footer.h3": "订阅更新", "footer.newsletter": "每月获取采购小贴士与平台资讯。", "footer.emailPh": "您的邮箱", "footer.join": "订阅",
      "footer.rights": "Ometong. 保留所有权利。",
      "js.errCompany": "请填写公司名称。", "js.errEmail": "请输入有效的企业邮箱。", "js.errCategory": "请选择一个品类。",
      "js.errFix": "请检查并修正标红的字段。",
      "js.success": "申请已收到！我们的团队将在2-3个工作日内通过邮件与您联系。",
      "js.subscribed": "感谢订阅！"
    },
    es: {
      "announce.text": "✦ Plan Supplier Growth — 50% de descuento los primeros 3 meses para nuevos fabricantes",
      "announce.link": "Ver precios →",
      "nav.how": "Cómo Funciona", "nav.categories": "Categorías", "nav.marketplace": "Mercado",
      "nav.suppliers": "Para Proveedores", "nav.advertise": "Publicidad", "nav.login": "Iniciar sesión", "nav.becomeSupplier": "Ser Proveedor",
      "hero.tag": "✦ Para Proveedores y Fabricantes",
      "hero.h1a": "Vende al mundo.", "hero.h1b": "Olvídate de la prospección en frío.",
      "hero.p": "Publica una vez y la IA te conecta con solicitudes de compradores, recibe tu pago mediante depósito en garantía, y deja que la red logística de Ometong gestione el transporte y la aduana — así te concentras en fabricar y enviar.",
      "hero.applyBtn": "Solicitar ser Proveedor", "hero.seeHowBtn": "Ver cómo funciona",
      "hero.trust": "proveedores verificados ya venden en Ometong",
      "hero.stat1": "Solicitudes de compradores activas / mes", "hero.stat2": "Países desde los que compran",
      "hero.stat3": "% de pagos en garantía exitosos", "hero.stat4": "Días promedio hasta el primer pedido",
      "benefits.tag": "Lo que obtienes", "benefits.h2": "Diseñado para que cierres más ventas, más rápido",
      "benefits.p": "Todo lo siguiente viene incluido — sin integraciones separadas ni proveedores adicionales que gestionar.",
      "benefits.b1.h": "Solicitudes de compradores emparejadas por IA",
      "benefits.b1.p": "Mostramos tus productos directamente a compradores que ya los buscan — no compites contra miles de anuncios sin relación.",
      "benefits.b2.h": "Pagos protegidos con depósito en garantía",
      "benefits.b2.p": "El pago del comprador se retiene de forma segura y se te libera en cuanto se confirma la entrega — ambas partes están protegidas.",
      "benefits.b3.h": "Logística gestionada por nosotros",
      "benefits.b3.p": "La reserva de transporte, los trámites aduaneros y el seguimiento los organiza nuestra red de socios — no necesitas tu propia licencia de exportación.",
      "benefits.b4.h": "Insignia verificada y perfil de confianza",
      "benefits.b4.p": "Verifica tus documentos una sola vez y conserva la insignia en todos tus anuncios — es lo primero que buscan los compradores.",
      "benefits.b5.h": "Panel de ventas sencillo",
      "benefits.b5.p": "Consulta qué anuncios reciben visitas y pedidos, y de dónde vienen tus compradores — sin necesidad de aprender otro software.",
      "benefits.b6.h": "Alcance global, sin contratar más personal",
      "benefits.b6.p": "Vende a compradores en más de 58 países sin contratar equipos de ventas regionales ni abrir oficinas locales.",
      "how.tag": "Cómo Funciona", "how.h2": "De la solicitud a tu primer pedido",
      "how.s1.h": "Solicita y verifícate", "how.s1.p": "Envía tus documentos comerciales una sola vez. Nuestro equipo verifica tu empresa en 2–3 días hábiles.",
      "how.s2.h": "Publica productos y servicios", "how.s2.p": "Añade tus productos con precios, pedido mínimo y tiempos de entrega. La IA etiqueta cada anuncio para que lo encuentren los compradores correctos.",
      "how.s3.h": "Recibe coincidencias y negocia", "how.s3.p": "Las solicitudes de compradores compatibles aparecen directamente en tu panel. Escribe, cotiza y cierra el trato, todo en la plataforma.",
      "how.s4.h": "Envía y cobra", "how.s4.p": "Entrega el pedido a nuestros socios logísticos. En cuanto el comprador confirme la recepción, tu pago se libera automáticamente.",
      "mutual.tag": "Por qué esto funciona para todos", "mutual.h2": "Un mercado que solo crece si tú creces",
      "mutual.p": "Ometong nunca compra ni almacena productos, y no compite contigo por los compradores. Solo ganamos dinero cuando ocurre una venta real — mediante suscripciones de proveedores y una pequeña comisión sobre pedidos protegidos por garantía. Así nuestros intereses están alineados con los tuyos: más proveedores verificados atraen más compradores, más compradores generan más solicitudes, y más datos hacen que el emparejamiento sea más inteligente para todos.",
      "mutual.i1.h": "Para proveedores y fabricantes",
      "mutual.i1.p": "Cuesta menos que ferias comerciales o prospección en frío, te paga más rápido mediante garantía, y una insignia de confianza que acelera las conversaciones con nuevos compradores.",
      "mutual.i2.h": "Para Ometong",
      "mutual.i2.p": "Ingresos constantes por suscripciones y transacciones, y mejores datos de emparejamiento a medida que crecen proveedores y compradores — todo sin asumir nunca riesgo de inventario.",
      "mutual.i3.h": "Para compradores",
      "mutual.i3.p": "Una forma más rápida de encontrar proveedores verificados y listos para enviar, en lugar de semanas de mensajes sin respuesta y afirmaciones que no se pueden comprobar.",
      "pricing.tag": "Precios", "pricing.h2": "Planes sencillos para proveedores",
      "pricing.starter.h": "Inicial", "pricing.starter.amt": "Gratis", "pricing.starter.p": "Verifícate y publica hasta 10 productos o servicios.",
      "pricing.starter.f1": "Insignia verificada", "pricing.starter.f2": "Hasta 10 anuncios", "pricing.starter.f3": "Emparejamiento estándar", "pricing.starter.btn": "Comenzar",
      "pricing.growth.tag": "Más Popular", "pricing.growth.h": "Supplier Growth", "pricing.growth.per": "/mes",
      "pricing.growth.p": "Anuncios ilimitados con emparejamiento prioritario por IA.",
      "pricing.growth.f1": "Anuncios ilimitados", "pricing.growth.f2": "Posición prioritaria", "pricing.growth.f3": "Panel de análisis", "pricing.growth.f4": "Pago en garantía prioritario",
      "pricing.growth.btn": "Iniciar prueba gratuita",
      "pricing.ent.h": "Empresarial", "pricing.ent.amt": "Personalizado", "pricing.ent.p": "Gestión de cuenta dedicada e integración logística.",
      "pricing.ent.f1": "Acceso API", "pricing.ent.f2": "Gestor dedicado", "pricing.ent.f3": "Contratos personalizados", "pricing.ent.btn": "Contactar Ventas",
      "testi.tag": "Nuestros proveedores opinan", "testi.h2": "Lo que dicen los fabricantes sobre vender aquí",
      "faq.tag": "Preguntas frecuentes", "faq.h2": "Preguntas comunes de proveedores",
      "faq.q1.q": "¿Cómo funciona la verificación de proveedores?",
      "faq.q1.a": "Envías los documentos de registro de tu empresa, el número fiscal y certificados de producto cuando corresponda. Nuestro equipo revisa y verifica en 2–3 días hábiles; después tu perfil muestra la insignia Verificado.",
      "faq.q2.q": "¿Cómo y cuándo me pagan?",
      "faq.q2.a": "El pago del comprador se retiene en garantía al hacer el pedido. Cuando el comprador confirma la entrega (o pasa el plazo sin disputa), el dinero se libera a tu cuenta de pagos.",
      "faq.q3.q": "¿Qué comisiones cobra Ometong?",
      "faq.q3.a": "El plan Inicial es gratis con un número limitado de anuncios. Supplier Growth cuesta $49/mes con anuncios ilimitados y emparejamiento prioritario. Se aplica una pequeña comisión en pedidos protegidos por garantía — siempre verás el monto completo antes de confirmar cualquier plan.",
      "faq.q4.q": "¿Debo organizar mi propio envío?",
      "faq.q4.a": "No — puedes dejar el envío en manos de nuestra red logística, que se encarga de la reserva de transporte, los trámites aduaneros y el seguimiento. También puedes organizar tu propio envío si lo prefieres.",
      "faq.q5.q": "¿A qué países puedo vender?",
      "faq.q5.a": "Los compradores en Ometong provienen actualmente de más de 58 países. Eliges a qué regiones estás dispuesto a enviar en cada anuncio que creas.",
      "apply.tag": "Comenzar", "apply.h2": "Solicita ser un proveedor verificado",
      "apply.p": "Cuéntanos un poco sobre tu negocio. Nuestro equipo revisa las solicitudes en 2–3 días hábiles y te contacta por correo con los siguientes pasos.",
      "apply.trust1": "Sin costo por solicitar", "apply.trust2": "Revisión en 2–3 días",
      "apply.f.company": "Nombre de la empresa", "apply.f.companyPh": "ej. Horizon Supply Co.",
      "apply.f.email": "Correo empresarial", "apply.f.category": "Categoría principal", "apply.f.categoryPh": "Selecciona una categoría",
      "apply.f.cat1": "Electrónica", "apply.f.cat2": "Textiles", "apply.f.cat3": "Maquinaria", "apply.f.cat4": "Alimentos y Bebidas",
      "apply.f.cat5": "Construcción", "apply.f.cat6": "Embalaje", "apply.f.cat7": "Servicios", "apply.f.cat8": "Logística",
      "apply.f.details": "Cuéntanos qué fabricas u ofreces", "apply.f.detailsPh": "Breve descripción de tus productos/servicios y volúmenes de pedido típicos",
      "apply.f.submit": "Enviar Solicitud",
      "footer.brand": "El mercado creado para el comercio global — productos, servicios y logística, emparejados por IA.",
      "footer.h1": "Mercado", "footer.products": "Productos", "footer.services": "Servicios", "footer.suppliers": "Proveedores",
      "footer.h2": "Empresa", "footer.contact": "Contacto",
      "footer.h3": "Mantente al día", "footer.newsletter": "Consejos de abastecimiento y noticias de la plataforma, cada mes.", "footer.emailPh": "Tu correo", "footer.join": "Unirse",
      "footer.rights": "Ometong. Todos los derechos reservados.",
      "js.errCompany": "El nombre de la empresa es obligatorio.", "js.errEmail": "Ingresa un correo empresarial válido.", "js.errCategory": "Selecciona una categoría.",
      "js.errFix": "Corrige los campos marcados.",
      "js.success": "¡Solicitud recibida! Nuestro equipo te contactará por correo en 2–3 días hábiles.",
      "js.subscribed": "¡Gracias! Ya estás suscrito."
    },
    fr: {
      "announce.text": "✦ Offre Supplier Growth — 50% de réduction les 3 premiers mois pour les nouveaux fabricants",
      "announce.link": "Voir les tarifs →",
      "nav.how": "Comment ça marche", "nav.categories": "Catégories", "nav.marketplace": "Marché",
      "nav.suppliers": "Pour les fournisseurs", "nav.advertise": "Publicité", "nav.login": "Connexion", "nav.becomeSupplier": "Devenir fournisseur",
      "hero.tag": "✦ Pour fournisseurs et fabricants",
      "hero.h1a": "Vendez au monde entier.", "hero.h1b": "Sans prospection à froid.",
      "hero.p": "Publiez une seule fois et laissez l'IA vous mettre en relation avec des demandes d'acheteurs, soyez payé via séquestre, et laissez le réseau logistique d'Ometong gérer le fret et la douane — concentrez-vous sur la fabrication et l'expédition.",
      "hero.applyBtn": "Devenir fournisseur", "hero.seeHowBtn": "Voir comment ça marche",
      "hero.trust": "fournisseurs vérifiés vendent déjà sur Ometong",
      "hero.stat1": "Demandes d'acheteurs actives / mois", "hero.stat2": "Pays d'origine des acheteurs",
      "hero.stat3": "% de réussite des paiements séquestrés", "hero.stat4": "Jours moyens avant la 1re commande",
      "benefits.tag": "Ce que vous obtenez", "benefits.h2": "Conçu pour vous aider à conclure plus de ventes, plus vite",
      "benefits.p": "Tout ce qui suit est inclus par défaut — aucune intégration séparée, aucun prestataire supplémentaire à gérer.",
      "benefits.b1.h": "Demandes d'acheteurs mises en correspondance par IA",
      "benefits.b1.p": "Vos produits sont montrés directement aux acheteurs qui les recherchent déjà — pas de concurrence avec des milliers d'annonces sans rapport.",
      "benefits.b2.h": "Paiements sécurisés par séquestre",
      "benefits.b2.p": "Le paiement de l'acheteur est retenu en toute sécurité et vous est versé dès que la livraison est confirmée — les deux parties sont protégées.",
      "benefits.b3.h": "Logistique prise en charge pour vous",
      "benefits.b3.p": "Réservation de fret, formalités douanières et suivi de livraison sont organisés par notre réseau de partenaires — aucune licence d'exportation requise.",
      "benefits.b4.h": "Badge vérifié et profil de confiance",
      "benefits.b4.p": "Vérifiez vos documents une seule fois, puis conservez le badge sur toutes vos annonces — c'est la première chose que regardent les acheteurs.",
      "benefits.b5.h": "Tableau de bord des ventes simple",
      "benefits.b5.p": "Voyez quelles annonces génèrent des vues et des commandes, et d'où viennent vos acheteurs — sans logiciel supplémentaire à apprendre.",
      "benefits.b6.h": "Portée mondiale, sans nouvelles embauches",
      "benefits.b6.p": "Vendez à des acheteurs dans plus de 58 pays sans embaucher d'équipes commerciales régionales ni ouvrir de bureaux locaux.",
      "how.tag": "Comment ça marche", "how.h2": "De la candidature à votre première commande",
      "how.s1.h": "Postulez et faites-vous vérifier", "how.s1.p": "Envoyez vos documents d'entreprise une seule fois. Notre équipe vérifie votre société sous 2 à 3 jours ouvrés.",
      "how.s2.h": "Publiez produits et services", "how.s2.p": "Ajoutez vos produits avec prix, quantités minimales et délais de fabrication. L'IA étiquette chaque annonce pour qu'elle soit trouvée par les bons acheteurs.",
      "how.s3.h": "Recevez des correspondances et négociez", "how.s3.p": "Les demandes d'acheteurs correspondantes apparaissent directement dans votre tableau de bord. Échangez, envoyez un devis et concluez l'accord, le tout sur la plateforme.",
      "how.s4.h": "Expédiez et soyez payé", "how.s4.p": "Confiez la commande à nos partenaires logistiques. Dès que l'acheteur confirme la réception, votre paiement est libéré automatiquement.",
      "mutual.tag": "Pourquoi ça marche pour tout le monde", "mutual.h2": "Une place de marché qui ne grandit que si vous grandissez",
      "mutual.p": "Ometong n'achète ni ne stocke jamais de produits, et nous ne sommes pas en concurrence avec vous pour les acheteurs. Nous ne gagnons de l'argent que lorsqu'un échange réel a lieu — via les abonnements fournisseurs et une petite commission sur les commandes protégées par séquestre. Nos intérêts sont donc alignés avec les vôtres : plus de fournisseurs vérifiés attirent plus d'acheteurs, plus d'acheteurs créent plus de demandes correspondantes, et de meilleures données rendent la mise en correspondance plus pertinente pour tous.",
      "mutual.i1.h": "Pour les fournisseurs et fabricants",
      "mutual.i1.p": "Coûte moins cher que les salons professionnels ou la prospection à froid, vous paie plus vite via le séquestre, et un badge de confiance qui accélère les échanges avec de nouveaux acheteurs.",
      "mutual.i2.h": "Pour Ometong",
      "mutual.i2.p": "Des revenus réguliers d'abonnement et de transaction, et de meilleures données de correspondance à mesure que fournisseurs et acheteurs se multiplient — sans jamais porter de risque de stock.",
      "mutual.i3.h": "Pour les acheteurs",
      "mutual.i3.p": "Un moyen plus rapide de trouver des fournisseurs vérifiés et prêts à expédier, plutôt que des semaines de messages sans réponse et d'affirmations invérifiables.",
      "pricing.tag": "Tarifs", "pricing.h2": "Des offres simples pour les fournisseurs",
      "pricing.starter.h": "Débutant", "pricing.starter.amt": "Gratuit", "pricing.starter.p": "Faites-vous vérifier et publiez jusqu'à 10 produits ou services.",
      "pricing.starter.f1": "Badge vérifié", "pricing.starter.f2": "Jusqu'à 10 annonces", "pricing.starter.f3": "Correspondance standard", "pricing.starter.btn": "Commencer",
      "pricing.growth.tag": "Le plus populaire", "pricing.growth.h": "Supplier Growth", "pricing.growth.per": "/mois",
      "pricing.growth.p": "Annonces illimitées avec mise en correspondance IA prioritaire.",
      "pricing.growth.f1": "Annonces illimitées", "pricing.growth.f2": "Placement prioritaire", "pricing.growth.f3": "Tableau de bord analytique", "pricing.growth.f4": "Paiement séquestré prioritaire",
      "pricing.growth.btn": "Démarrer l'essai gratuit",
      "pricing.ent.h": "Entreprise", "pricing.ent.amt": "Sur mesure", "pricing.ent.p": "Gestion de compte dédiée et intégration logistique.",
      "pricing.ent.f1": "Accès API", "pricing.ent.f2": "Gestionnaire dédié", "pricing.ent.f3": "Contrats personnalisés", "pricing.ent.btn": "Contacter les ventes",
      "testi.tag": "Nos fournisseurs témoignent", "testi.h2": "Ce que disent les fabricants de la vente ici",
      "faq.tag": "FAQ", "faq.h2": "Questions fréquentes des fournisseurs",
      "faq.q1.q": "Comment fonctionne la vérification des fournisseurs ?",
      "faq.q1.a": "Vous soumettez vos documents d'immatriculation, votre numéro fiscal et les certifications produit le cas échéant. Notre équipe examine et vérifie sous 2 à 3 jours ouvrés, puis votre profil affiche le badge Vérifié.",
      "faq.q2.q": "Comment et quand suis-je payé ?",
      "faq.q2.a": "Le paiement de l'acheteur est placé sous séquestre à la commande. Une fois la livraison confirmée par l'acheteur (ou le délai écoulé sans litige), les fonds sont versés sur votre compte de paiement.",
      "faq.q3.q": "Quels frais Ometong facture-t-il ?",
      "faq.q3.a": "L'offre Débutant est gratuite avec un nombre limité d'annonces. Supplier Growth coûte 49 $/mois pour des annonces illimitées et une correspondance prioritaire. Des frais de transaction réduits s'appliquent sur les commandes protégées par séquestre — le montant total est toujours affiché avant de confirmer une offre.",
      "faq.q4.q": "Dois-je organiser mon propre transport ?",
      "faq.q4.a": "Non — vous pouvez confier l'expédition à notre réseau logistique, qui s'occupe de la réservation du fret, des formalités douanières et du suivi. Vous pouvez aussi organiser votre propre transport si vous préférez.",
      "faq.q5.q": "Dans quels pays puis-je vendre ?",
      "faq.q5.a": "Les acheteurs sur Ometong viennent actuellement de plus de 58 pays. Vous choisissez les régions vers lesquelles vous acceptez d'expédier pour chaque annonce que vous créez.",
      "apply.tag": "Commencer", "apply.h2": "Devenez fournisseur vérifié",
      "apply.p": "Parlez-nous un peu de votre entreprise. Notre équipe examine les candidatures sous 2 à 3 jours ouvrés et revient vers vous par e-mail avec les prochaines étapes.",
      "apply.trust1": "Candidature gratuite", "apply.trust2": "Examen sous 2 à 3 jours",
      "apply.f.company": "Nom de l'entreprise", "apply.f.companyPh": "ex. Horizon Supply Co.",
      "apply.f.email": "E-mail professionnel", "apply.f.category": "Catégorie principale", "apply.f.categoryPh": "Choisissez une catégorie",
      "apply.f.cat1": "Électronique", "apply.f.cat2": "Textiles", "apply.f.cat3": "Machinerie", "apply.f.cat4": "Alimentation et boissons",
      "apply.f.cat5": "Construction", "apply.f.cat6": "Emballage", "apply.f.cat7": "Services", "apply.f.cat8": "Logistique",
      "apply.f.details": "Décrivez ce que vous fabriquez ou proposez", "apply.f.detailsPh": "Brève description de vos produits/services et volumes de commande habituels",
      "apply.f.submit": "Envoyer la candidature",
      "footer.brand": "La place de marché conçue pour le commerce mondial — produits, services et logistique, mis en correspondance par IA.",
      "footer.h1": "Marché", "footer.products": "Produits", "footer.services": "Services", "footer.suppliers": "Fournisseurs",
      "footer.h2": "Entreprise", "footer.contact": "Contact",
      "footer.h3": "Restez informé", "footer.newsletter": "Conseils d'approvisionnement et actualités de la plateforme, chaque mois.", "footer.emailPh": "Votre e-mail", "footer.join": "S'inscrire",
      "footer.rights": "Ometong. Tous droits réservés.",
      "js.errCompany": "Le nom de l'entreprise est requis.", "js.errEmail": "Saisissez un e-mail professionnel valide.", "js.errCategory": "Veuillez choisir une catégorie.",
      "js.errFix": "Merci de corriger les champs signalés.",
      "js.success": "Candidature reçue ! Notre équipe vous recontactera par e-mail sous 2 à 3 jours ouvrés.",
      "js.subscribed": "Merci — vous êtes inscrit !"
    },
    hi: {
      "announce.text": "✦ सप्लायर ग्रोथ प्लान — नए निर्माताओं के लिए पहले 3 महीने 50% छूट पर",
      "announce.link": "कीमतें देखें →",
      "nav.how": "यह कैसे काम करता है", "nav.categories": "श्रेणियाँ", "nav.marketplace": "मार्केटप्लेस",
      "nav.suppliers": "सप्लायर के लिए", "nav.advertise": "विज्ञापन दें", "nav.login": "लॉगिन", "nav.becomeSupplier": "सप्लायर बनें",
      "hero.tag": "✦ सप्लायर और निर्माताओं के लिए",
      "hero.h1a": "पूरी दुनिया को बेचें।", "hero.h1b": "कोल्ड आउटरीच की ज़रूरत नहीं।",
      "hero.p": "एक बार लिस्ट करें और AI आपको खरीदारों के अनुरोधों से जोड़ देगा, एस्क्रो के ज़रिए सुरक्षित भुगतान पाएं, और शिपिंग व कस्टम्स का काम Ometong का लॉजिस्टिक्स नेटवर्क संभालेगा — आप सिर्फ़ बनाने और भेजने पर ध्यान दें।",
      "hero.applyBtn": "सप्लायर बनने के लिए आवेदन करें", "hero.seeHowBtn": "देखें यह कैसे काम करता है",
      "hero.trust": "सत्यापित सप्लायर पहले से ही Ometong पर बेच रहे हैं",
      "hero.stat1": "हर महीने सक्रिय खरीदार अनुरोध", "hero.stat2": "जिन देशों से खरीदार आते हैं",
      "hero.stat3": "% एस्क्रो भुगतान सफलता दर", "hero.stat4": "पहले ऑर्डर तक औसत दिन",
      "benefits.tag": "आपको क्या मिलता है", "benefits.h2": "सप्लायर को तेज़ी से ज़्यादा डील पक्की करने में मदद के लिए बनाया गया",
      "benefits.p": "नीचे दी गई हर चीज़ पहले से शामिल है — कोई अलग इंटीग्रेशन या अतिरिक्त सेवा प्रदाता नहीं।",
      "benefits.b1.h": "AI-मैच्ड खरीदार अनुरोध",
      "benefits.b1.p": "हम आपके प्रोडक्ट सीधे उन खरीदारों को दिखाते हैं जो पहले से उन्हें खोज रहे हैं — हज़ारों असंबंधित लिस्टिंग से मुकाबला नहीं करना पड़ता।",
      "benefits.b2.h": "एस्क्रो-सुरक्षित भुगतान",
      "benefits.b2.p": "खरीदार का भुगतान सुरक्षित रूप से रोका जाता है और डिलीवरी की पुष्टि होते ही आपको दे दिया जाता है — दोनों पक्ष सुरक्षित रहते हैं।",
      "benefits.b3.h": "लॉजिस्टिक्स आपके लिए संभाला जाता है",
      "benefits.b3.p": "फ्रेट बुकिंग, कस्टम्स कागज़ी काम और डिलीवरी ट्रैकिंग हमारा पार्टनर नेटवर्क संभालता है — आपको अपना एक्सपोर्ट लाइसेंस नहीं चाहिए।",
      "benefits.b4.h": "सत्यापित बैज और भरोसेमंद प्रोफ़ाइल",
      "benefits.b4.p": "एक बार अपने दस्तावेज़ सत्यापित करें, फिर हर लिस्टिंग पर बैज बना रहेगा — खरीदार सबसे पहले यही देखते हैं।",
      "benefits.b5.h": "सरल सेल्स डैशबोर्ड",
      "benefits.b5.p": "देखें कौन-सी लिस्टिंग को व्यू और ऑर्डर मिल रहे हैं, और आपके खरीदार कहाँ से आ रहे हैं — कोई अतिरिक्त सॉफ़्टवेयर सीखने की ज़रूरत नहीं।",
      "benefits.b6.h": "नई भर्ती के बिना वैश्विक पहुँच",
      "benefits.b6.p": "क्षेत्रीय सेल्स टीम बनाए या स्थानीय ऑफ़िस खोले बिना 58+ देशों के खरीदारों को बेचें।",
      "how.tag": "यह कैसे काम करता है", "how.h2": "आवेदन से आपके पहले ऑर्डर तक",
      "how.s1.h": "आवेदन करें और सत्यापित हों", "how.s1.p": "अपने बिज़नेस दस्तावेज़ एक बार जमा करें। हमारी टीम 2–3 कार्यदिवसों में आपकी कंपनी की जाँच करेगी।",
      "how.s2.h": "प्रोडक्ट और सेवाएँ लिस्ट करें", "how.s2.p": "कीमत, न्यूनतम ऑर्डर मात्रा और बनने में लगने वाले समय के साथ अपने प्रोडक्ट जोड़ें। AI हर लिस्टिंग को टैग करता है ताकि सही खरीदार उसे ढूँढ सकें।",
      "how.s3.h": "मैच पाएं और बातचीत करें", "how.s3.p": "मिलते-जुलते खरीदार अनुरोध सीधे आपके डैशबोर्ड में दिखते हैं। मैसेज करें, कोटेशन भेजें और डील प्लेटफ़ॉर्म पर ही तय करें।",
      "how.s4.h": "शिप करें और भुगतान पाएं", "how.s4.p": "ऑर्डर हमारे लॉजिस्टिक्स पार्टनर को सौंप दें। खरीदार के डिलीवरी की पुष्टि करते ही आपका भुगतान अपने आप जारी हो जाता है।",
      "mutual.tag": "यह सभी के लिए क्यों काम करता है", "mutual.h2": "एक ऐसा मार्केटप्लेस जो सिर्फ़ आपके साथ बढ़ता है",
      "mutual.p": "Ometong कभी भी प्रोडक्ट नहीं खरीदता या स्टोर नहीं करता, और हम खरीदारों के लिए आपसे प्रतिस्पर्धा नहीं करते। हम केवल तब कमाते हैं जब असली व्यापार होता है — सप्लायर सब्सक्रिप्शन और एस्क्रो-सुरक्षित ऑर्डर पर एक छोटी फ़ीस से। इसलिए हमारे हित आपके साथ जुड़े रहते हैं: ज़्यादा सत्यापित सप्लायर ज़्यादा खरीदार लाते हैं, ज़्यादा खरीदार ज़्यादा मैचिंग अनुरोध बनाते हैं, और बेहतर डेटा सबके लिए मैचिंग को स्मार्ट बनाता है।",
      "mutual.i1.h": "सप्लायर और निर्माताओं के लिए",
      "mutual.i1.p": "ट्रेड शो या कोल्ड आउटरीच से कम लागत, एस्क्रो के ज़रिए तेज़ भुगतान, और भरोसे का बैज जो नए खरीदारों से बातचीत को तेज़ करता है।",
      "mutual.i2.h": "Ometong के लिए",
      "mutual.i2.p": "स्थिर सब्सक्रिप्शन और ट्रांज़ैक्शन आय, और सप्लायर व खरीदार दोनों के बढ़ने पर बेहतर मैचिंग डेटा — बिना कभी इन्वेंट्री का जोखिम उठाए।",
      "mutual.i3.h": "खरीदारों के लिए",
      "mutual.i3.p": "हफ़्तों के बिना-जवाब मैसेज और असत्यापित दावों की जगह, जाँचे-परखे, तुरंत शिप करने के लिए तैयार सप्लायर पाने का तेज़ तरीका।",
      "pricing.tag": "कीमतें", "pricing.h2": "सप्लायर के लिए सरल प्लान",
      "pricing.starter.h": "स्टार्टर", "pricing.starter.amt": "मुफ़्त", "pricing.starter.p": "सत्यापित हों और 10 तक प्रोडक्ट या सेवाएँ लिस्ट करें।",
      "pricing.starter.f1": "सत्यापित बैज", "pricing.starter.f2": "10 तक लिस्टिंग", "pricing.starter.f3": "स्टैंडर्ड खरीदार मैचिंग", "pricing.starter.btn": "शुरू करें",
      "pricing.growth.tag": "सबसे लोकप्रिय", "pricing.growth.h": "सप्लायर ग्रोथ", "pricing.growth.per": "/माह",
      "pricing.growth.p": "प्राथमिकता वाली AI मैचिंग के साथ असीमित लिस्टिंग।",
      "pricing.growth.f1": "असीमित लिस्टिंग", "pricing.growth.f2": "प्राथमिकता स्थान", "pricing.growth.f3": "एनालिटिक्स डैशबोर्ड", "pricing.growth.f4": "प्राथमिकता एस्क्रो भुगतान",
      "pricing.growth.btn": "फ़्री ट्रायल शुरू करें",
      "pricing.ent.h": "एंटरप्राइज़", "pricing.ent.amt": "कस्टम", "pricing.ent.p": "समर्पित अकाउंट प्रबंधन और लॉजिस्टिक्स इंटीग्रेशन।",
      "pricing.ent.f1": "API एक्सेस", "pricing.ent.f2": "समर्पित मैनेजर", "pricing.ent.f3": "कस्टम कॉन्ट्रैक्ट", "pricing.ent.btn": "सेल्स से संपर्क करें",
      "testi.tag": "हमारे सप्लायर से", "testi.h2": "यहाँ बेचने पर निर्माता क्या कहते हैं",
      "faq.tag": "सामान्य प्रश्न", "faq.h2": "सप्लायर के सामान्य सवाल",
      "faq.q1.q": "सप्लायर सत्यापन कैसे काम करता है?",
      "faq.q1.a": "आप बिज़नेस रजिस्ट्रेशन दस्तावेज़, टैक्स आईडी, और ज़रूरत पड़ने पर प्रोडक्ट सर्टिफ़िकेट जमा करते हैं। हमारी टीम 2–3 कार्यदिवसों में जाँच कर सत्यापित करती है, फिर आपकी प्रोफ़ाइल पर सत्यापित बैज दिखता है।",
      "faq.q2.q": "मुझे भुगतान कैसे और कब मिलता है?",
      "faq.q2.a": "ऑर्डर देते समय खरीदार का भुगतान एस्क्रो में रखा जाता है। खरीदार के डिलीवरी की पुष्टि करते ही (या बिना विवाद के पुष्टि अवधि बीतने पर), पैसा आपके पेआउट अकाउंट में भेज दिया जाता है।",
      "faq.q3.q": "Ometong कौन-सी फ़ीस लेता है?",
      "faq.q3.a": "स्टार्टर सीमित लिस्टिंग के साथ मुफ़्त है। सप्लायर ग्रोथ असीमित लिस्टिंग और प्राथमिकता मैचिंग के लिए $49/माह है। एस्क्रो-सुरक्षित ऑर्डर पर एक छोटी ट्रांज़ैक्शन फ़ीस लगती है — कोई भी प्लान कन्फ़र्म करने से पहले पूरी राशि हमेशा दिखाई जाती है।",
      "faq.q4.q": "क्या मुझे अपनी शिपिंग खुद व्यवस्थित करनी होगी?",
      "faq.q4.a": "नहीं — आप हमारे लॉजिस्टिक्स पार्टनर नेटवर्क को फ़ुलफ़िलमेंट सौंप सकते हैं, जो फ़्रेट बुकिंग, कस्टम्स कागज़ी काम और ट्रैकिंग संभालता है। चाहें तो अपनी शिपिंग खुद भी व्यवस्थित कर सकते हैं।",
      "faq.q5.q": "मैं किन देशों में बेच सकता हूँ?",
      "faq.q5.a": "Ometong पर खरीदार फ़िलहाल 58+ देशों से आते हैं। आप हर लिस्टिंग बनाते समय चुन सकते हैं कि आप किन क्षेत्रों में शिप करना चाहते हैं।",
      "apply.tag": "शुरू करें", "apply.h2": "सत्यापित सप्लायर बनने के लिए आवेदन करें",
      "apply.p": "अपने बिज़नेस के बारे में थोड़ा बताएं। हमारी टीम 2–3 कार्यदिवसों में आवेदन की समीक्षा करती है और अगले चरणों के लिए ईमेल से संपर्क करती है।",
      "apply.trust1": "आवेदन करने का कोई शुल्क नहीं", "apply.trust2": "2–3 दिन में समीक्षा",
      "apply.f.company": "कंपनी का नाम", "apply.f.companyPh": "जैसे Horizon Supply Co.",
      "apply.f.email": "बिज़नेस ईमेल", "apply.f.category": "मुख्य श्रेणी", "apply.f.categoryPh": "एक श्रेणी चुनें",
      "apply.f.cat1": "इलेक्ट्रॉनिक्स", "apply.f.cat2": "टेक्सटाइल", "apply.f.cat3": "मशीनरी", "apply.f.cat4": "खाद्य एवं पेय पदार्थ",
      "apply.f.cat5": "निर्माण", "apply.f.cat6": "पैकेजिंग", "apply.f.cat7": "सेवाएँ", "apply.f.cat8": "लॉजिस्टिक्स",
      "apply.f.details": "बताएं आप क्या बनाते या पेश करते हैं", "apply.f.detailsPh": "अपने प्रोडक्ट/सेवाओं और सामान्य ऑर्डर मात्रा का संक्षिप्त विवरण",
      "apply.f.submit": "आवेदन जमा करें",
      "footer.brand": "वैश्विक व्यापार के लिए बना मार्केटप्लेस — प्रोडक्ट, सेवाएँ और लॉजिस्टिक्स, AI द्वारा मैच किए गए।",
      "footer.h1": "मार्केटप्लेस", "footer.products": "प्रोडक्ट", "footer.services": "सेवाएँ", "footer.suppliers": "सप्लायर",
      "footer.h2": "कंपनी", "footer.contact": "संपर्क करें",
      "footer.h3": "अपडेट रहें", "footer.newsletter": "सोर्सिंग टिप्स और प्लेटफ़ॉर्म समाचार, हर महीने।", "footer.emailPh": "आपका ईमेल", "footer.join": "जुड़ें",
      "footer.rights": "Ometong. सर्वाधिकार सुरक्षित।",
      "js.errCompany": "कंपनी का नाम आवश्यक है।", "js.errEmail": "एक मान्य बिज़नेस ईमेल दर्ज करें।", "js.errCategory": "कृपया एक श्रेणी चुनें।",
      "js.errFix": "कृपया हाइलाइट किए गए फ़ील्ड ठीक करें।",
      "js.success": "आवेदन प्राप्त हुआ! हमारी टीम 2–3 कार्यदिवसों में ईमेल से संपर्क करेगी।",
      "js.subscribed": "धन्यवाद — आप सब्सक्राइब हो गए हैं!"
    },
    si: {
      "announce.text": "✦ සැපයුම්කරු වර්ධන සැලැස්ම — නව නිෂ්පාදකයින්ට පළමු මාස 3ට 50% වට්ටමක්",
      "announce.link": "මිල ගණන් බලන්න →",
      "nav.how": "මෙය ක්‍රියා කරන ආකාරය", "nav.categories": "කාණ්ඩ", "nav.marketplace": "වෙළඳපොළ",
      "nav.suppliers": "සැපයුම්කරුවන් සඳහා", "nav.advertise": "වෙළඳ දැන්වීම්", "nav.login": "පිවිසෙන්න", "nav.becomeSupplier": "සැපයුම්කරුවෙකු වන්න",
      "hero.tag": "✦ සැපයුම්කරුවන් සහ නිෂ්පාදකයින් සඳහා",
      "hero.h1a": "ලෝකයටම විකුණන්න.", "hero.h1b": "සීතල ප්‍රචාරණයකින් තොරව.",
      "hero.p": "එක් වරක් ලැයිස්තුගත කර AI මගින් ඔබව ගැනුම්කරුවන්ගේ ඉල්ලීම් සමඟ ගැලපේ, එස්ක්‍රෝ හරහා ආරක්ෂිතව ගෙවීම් ලබා ගන්න, නැව්ගත කිරීම සහ රේගු කටයුතු Ometong හි ලොජිස්ටික්ස් ජාලය හසුරුවයි — ඔබ නිෂ්පාදනය කිරීම හා යැවීම කෙරෙහි පමණක් අවධානය යොමු කරන්න.",
      "hero.applyBtn": "සැපයුම්කරුවෙකු ලෙස අයදුම් කරන්න", "hero.seeHowBtn": "මෙය ක්‍රියා කරන ආකාරය බලන්න",
      "hero.trust": "සත්‍යාපිත සැපයුම්කරුවන් දැනටමත් Ometong හි විකුණයි",
      "hero.stat1": "මසකට සක්‍රීය ගැනුම්කරු ඉල්ලීම්", "hero.stat2": "ගැනුම්කරුවන් පැමිණෙන රටවල් ගණන",
      "hero.stat3": "% එස්ක්‍රෝ ගෙවීම් සාර්ථකත්ව අනුපාතය", "hero.stat4": "පළමු ඇණවුමට සාමාන්‍ය දින ගණන",
      "benefits.tag": "ඔබට ලැබෙන දේ", "benefits.h2": "සැපයුම්කරුවන්ට වේගයෙන් වැඩි ගනුදෙනු අවසන් කිරීමට උපකාරී වේ",
      "benefits.p": "පහත සියල්ල සම්මතයෙන්ම ලැබේ — වෙනම ඒකාබද්ධ කිරීම් හෝ අමතර සැපයුම්කරුවන් අවශ්‍ය නොවේ.",
      "benefits.b1.h": "AI මගින් ගැලපු ගැනුම්කරු ඉල්ලීම්",
      "benefits.b1.p": "ඔබේ නිෂ්පාදන දැනටමත් ඒවා සොයන ගැනුම්කරුවන්ට කෙලින්ම පෙන්වයි — අදාළ නොවන දහස් ගණන් ලැයිස්තු සමඟ තරඟ කිරීමට අවශ්‍ය නැත.",
      "benefits.b2.h": "එස්ක්‍රෝ මගින් ආරක්ෂිත ගෙවීම්",
      "benefits.b2.p": "ගැනුම්කරුගේ ගෙවීම ආරක්ෂිතව රඳවා තබා ගනු ලබන අතර බෙදාහැරීම තහවුරු වූ විගසම ඔබට ගෙවනු ලැබේ — දෙපාර්ශ්වයම ආරක්ෂා වේ.",
      "benefits.b3.h": "ලොජිස්ටික්ස් ඔබ වෙනුවෙන් හසුරුවනු ලැබේ",
      "benefits.b3.p": "නැව්ගත කිරීමේ වෙන්කිරීම්, රේගු ලේඛන සහ බෙදාහැරීමේ ලුහුබැඳීම අපගේ හවුල්කරු ජාලය මගින් සකසනු ලැබේ — ඔබට තමන්ගේම අපනයන බලපත්‍රයක් අවශ්‍ය නොවේ.",
      "benefits.b4.h": "සත්‍යාපිත බැජ් සහ විශ්වාස පැතිකඩ",
      "benefits.b4.p": "ඔබේ ලේඛන එක් වරක් සත්‍යාපනය කරන්න, පසුව සෑම ලැයිස්තුවකම බැජ් එක තබාගන්න — එයයි ගැනුම්කරුවන් මුලින්ම සොයන දේ.",
      "benefits.b5.h": "සරල විකුණුම් උපකරණ පුවරුව",
      "benefits.b5.p": "බැලීම් හා ඇණවුම් ලැබෙන ලැයිස්තු මොනවාද, ඔබේ ගැනුම්කරුවන් පැමිණෙන්නේ කොහෙන්ද යන්න බලන්න — අමතර මෘදුකාංගයක් ඉගෙනගැනීමකින් තොරව.",
      "benefits.b6.h": "නව බඳවා ගැනීම් නොමැතිව ගෝලීය ව්‍යාප්තිය",
      "benefits.b6.p": "කලාපීය විකුණුම් කණ්ඩායම් බඳවා ගැනීමකින් හෝ ප්‍රාදේශීය කාර්යාල විවෘත කිරීමකින් තොරව රටවල් 58කට වඩා වැඩි ගැනුම්කරුවන්ට විකුණන්න.",
      "how.tag": "මෙය ක්‍රියා කරන ආකාරය", "how.h2": "අයදුම්පත සිට ඔබේ පළමු ඇණවුම දක්වා",
      "how.s1.h": "අයදුම් කර සත්‍යාපනය කරගන්න", "how.s1.p": "ඔබේ ව්‍යාපාරික ලේඛන එක් වරක් ඉදිරිපත් කරන්න. අපගේ කණ්ඩායම දින 2–3ක් තුළ ඔබේ සමාගම සත්‍යාපනය කරයි.",
      "how.s2.h": "නිෂ්පාදන සහ සේවා ලැයිස්තුගත කරන්න", "how.s2.p": "මිල, අවම ඇණවුම් ප්‍රමාණය සහ නිෂ්පාදන කාලය සමඟ ඔබේ නිෂ්පාදන එකතු කරන්න. නිවැරදි ගැනුම්කරුවන්ට සොයාගත හැකි වන පරිදි AI විසින් සෑම ලැයිස්තුවක්ම ටැග් කරයි.",
      "how.s3.h": "ගැලපීම් ලබා ගෙන සාකච්ඡා කරන්න", "how.s3.p": "ගැලපෙන ගැනුම්කරු ඉල්ලීම් කෙලින්ම ඔබේ උපකරණ පුවරුවේ පෙන්වයි. පණිවිඩ යවන්න, මිල ගණන් යවන්න, ගනුදෙනුව එකම වේදිකාවේදී අවසන් කරන්න.",
      "how.s4.h": "නැව්ගත කර ගෙවීම ලබාගන්න", "how.s4.p": "ඇණවුම අපගේ ලොජිස්ටික්ස් හවුල්කරුවන්ට භාර දෙන්න. ගැනුම්කරු එය ලැබුණු බව තහවුරු කළ විගසම, ඔබේ ගෙවීම ස්වයංක්‍රීයව නිකුත් වේ.",
      "mutual.tag": "මෙය සැමට ක්‍රියාත්මක වන්නේ ඇයි", "mutual.h2": "ඔබ වර්ධනය වන විට පමණක් වර්ධනය වන වෙළඳපොළක්",
      "mutual.p": "Ometong කිසිදා නිෂ්පාදන මිලදී නොගනී හෝ ගබඩා නොකරයි, ගැනුම්කරුවන් සඳහා අප ඔබ සමඟ තරඟ නොකරයි. සත්‍ය ගනුදෙනුවක් සිදු වූ විට පමණක් අප ආදායම් උපයයි — සැපයුම්කරු දායකත්ව සහ එස්ක්‍රෝ ආරක්ෂිත ඇණවුම් මත සුළු ගාස්තුවක් හරහා. එබැවින් වඩාත් සත්‍යාපිත සැපයුම්කරුවන් වැඩි ගැනුම්කරුවන් ගෙන එයි, වැඩි ගැනුම්කරුවන් වැඩි ගැලපුම් ඉල්ලීම් නිර්මාණය කරයි, වඩා හොඳ දත්ත සැමට ගැලපීම වඩාත් දක්ෂ කරයි.",
      "mutual.i1.h": "සැපයුම්කරුවන් සහ නිෂ්පාදකයින් සඳහා",
      "mutual.i1.p": "වෙළඳ ප්‍රදර්ශන හෝ සීතල ප්‍රචාරණයට වඩා අඩු පිරිවැයක්, එස්ක්‍රෝ හරහා වේගවත් ගෙවීම්, සහ නව ගැනුම්කරුවන් සමඟ සාකච්ඡා වේගවත් කරන විශ්වාස බැජ් එකක්.",
      "mutual.i2.h": "Ometong සඳහා",
      "mutual.i2.p": "ස්ථාවර දායකත්ව සහ ගනුදෙනු ආදායම, සැපයුම්කරුවන් සහ ගැනුම්කරුවන් දෙදෙනාම වර්ධනය වන විට වඩා හොඳ ගැලපුම් දත්ත — කිසිදා ගබඩා අවදානමක් නොසැලකිල්ලෙන්.",
      "mutual.i3.h": "ගැනුම්කරුවන් සඳහා",
      "mutual.i3.p": "සති ගණනාවක් පිළිතුරු නොලද පණිවිඩ සහ තහවුරු කළ නොහැකි කියවීම් වෙනුවට, පරීක්ෂා කරන ලද, නැව්ගත කිරීමට සූදානම් සැපයුම්කරුවන් සොයාගැනීමට වේගවත් ක්‍රමයක්.",
      "pricing.tag": "මිල ගණන්", "pricing.h2": "සැපයුම්කරුවන් සඳහා සරල සැලසුම්",
      "pricing.starter.h": "ආරම්භක", "pricing.starter.amt": "නොමිලේ", "pricing.starter.p": "සත්‍යාපනය කරගෙන නිෂ්පාදන හෝ සේවා 10ක් දක්වා ලැයිස්තුගත කරන්න.",
      "pricing.starter.f1": "සත්‍යාපිත බැජ්", "pricing.starter.f2": "ලැයිස්තු 10ක් දක්වා", "pricing.starter.f3": "සම්මත ගැනුම්කරු ගැලපීම", "pricing.starter.btn": "ආරම්භ කරන්න",
      "pricing.growth.tag": "වඩාත් ජනප්‍රිය", "pricing.growth.h": "සැපයුම්කරු වර්ධනය", "pricing.growth.per": "/මාසයට",
      "pricing.growth.p": "ප්‍රමුඛතා AI ගැලපීම සමඟ අසීමිත ලැයිස්තු.",
      "pricing.growth.f1": "අසීමිත ලැයිස්තු", "pricing.growth.f2": "ප්‍රමුඛතා ස්ථානගත කිරීම", "pricing.growth.f3": "විශ්ලේෂණ උපකරණ පුවරුව", "pricing.growth.f4": "ප්‍රමුඛතා එස්ක්‍රෝ ගෙවීම",
      "pricing.growth.btn": "නොමිලේ අත්හදා බැලීම ආරම්භ කරන්න",
      "pricing.ent.h": "එන්ටර්ප්‍රයිස්", "pricing.ent.amt": "අභිරුචි", "pricing.ent.p": "කැපවූ ගිණුම් කළමනාකරණය සහ ලොජිස්ටික්ස් ඒකාබද්ධ කිරීම.",
      "pricing.ent.f1": "API ප්‍රවේශය", "pricing.ent.f2": "කැපවූ කළමනාකරු", "pricing.ent.f3": "අභිරුචි ගිවිසුම්", "pricing.ent.btn": "විකුණුම් අමතන්න",
      "testi.tag": "අපගේ සැපයුම්කරුවන්ගෙන්", "testi.h2": "මෙහි විකිණීම ගැන නිෂ්පාදකයින් පවසන දේ",
      "faq.tag": "නිතර අසන ප්‍රශ්න", "faq.h2": "සැපයුම්කරුවන්ගේ පොදු ප්‍රශ්න",
      "faq.q1.q": "සැපයුම්කරු සත්‍යාපනය ක්‍රියා කරන්නේ කෙසේද?",
      "faq.q1.a": "ඔබ ව්‍යාපාරික ලියාපදිංචි ලේඛන, බදු අංකය, සහ අදාළ නම් නිෂ්පාදන සහතික ඉදිරිපත් කරයි. අපගේ කණ්ඩායම දින 2–3ක් තුළ පරීක්ෂා කර සත්‍යාපනය කරයි, පසුව ඔබේ පැතිකඩේ සත්‍යාපිත බැජ් එක පෙන්වයි.",
      "faq.q2.q": "මට ගෙවීම ලැබෙන්නේ කෙසේද සහ කවදාද?",
      "faq.q2.a": "ඇණවුමක් තැබූ විට ගැනුම්කරුගේ ගෙවීම එස්ක්‍රෝ තුළ තබනු ලැබේ. ගැනුම්කරු බෙදාහැරීම තහවුරු කළ පසු (හෝ ආරවුලකින් තොරව තහවුරු කිරීමේ කාලය ඉකුත් වූ පසු), මුදල ඔබේ ගෙවීම් ගිණුමට නිකුත් කරනු ලැබේ.",
      "faq.q3.q": "Ometong අය කරන ගාස්තු මොනවාද?",
      "faq.q3.a": "ආරම්භක සැලැස්ම සීමිත ලැයිස්තු ගණනක් සමඟ නොමිලේ. සැපයුම්කරු වර්ධනය අසීමිත ලැයිස්තු සහ ප්‍රමුඛතා ගැලපීම සඳහා මසකට $49කි. එස්ක්‍රෝ ආරක්ෂිත ඇණවුම් මත සුළු ගනුදෙනු ගාස්තුවක් අය කෙරේ — ඕනෑම සැලැස්මක් තහවුරු කිරීමට පෙර සම්පූර්ණ මුදල සැමවිටම පෙන්වයි.",
      "faq.q4.q": "මට මගේම නැව්ගත කිරීම සකස් කිරීමට අවශ්‍යද?",
      "faq.q4.a": "නැත — ඔබට අපගේ ලොජිස්ටික්ස් හවුල්කරු ජාලයට භාරදිය හැක, එය නැව්ගත කිරීමේ වෙන්කිරීම්, රේගු ලේඛන සහ ලුහුබැඳීම භාරගනී. ඔබට කැමති නම් ඔබේම නැව්ගත කිරීම ද සකස් කළ හැක.",
      "faq.q5.q": "මට කුමන රටවලට විකිණිය හැකිද?",
      "faq.q5.a": "Ometong හි ගැනුම්කරුවන් දැනට රටවල් 58කට වඩා වැඩි ප්‍රමාණයකින් පැමිණේ. ඔබ සාදන සෑම ලැයිස්තුවක් සඳහාම ඔබ නැව්ගත කිරීමට කැමති කලාප තෝරාගනී.",
      "apply.tag": "ආරම්භ කරන්න", "apply.h2": "සත්‍යාපිත සැපයුම්කරුවෙකු වීමට අයදුම් කරන්න",
      "apply.p": "ඔබේ ව්‍යාපාරය ගැන අපට ටිකක් කියන්න. අපගේ කණ්ඩායම දින 2–3ක් තුළ අයදුම්පත් සමාලෝචනය කර ඊමේල් මගින් ඊළඟ පියවර ගැන දන්වයි.",
      "apply.trust1": "අයදුම් කිරීමට ගාස්තුවක් නැත", "apply.trust2": "දින 2–3ක සමාලෝචනයක්",
      "apply.f.company": "සමාගමේ නම", "apply.f.companyPh": "උදා. Horizon Supply Co.",
      "apply.f.email": "ව්‍යාපාරික ඊමේල්", "apply.f.category": "ප්‍රධාන කාණ්ඩය", "apply.f.categoryPh": "කාණ්ඩයක් තෝරන්න",
      "apply.f.cat1": "විද්‍යුත් උපකරණ", "apply.f.cat2": "රෙදිපිළි", "apply.f.cat3": "යන්ත්‍රෝපකරණ", "apply.f.cat4": "ආහාර සහ පාන",
      "apply.f.cat5": "ඉදිකිරීම්", "apply.f.cat6": "පැකේජිං", "apply.f.cat7": "සේවා", "apply.f.cat8": "ලොජිස්ටික්ස්",
      "apply.f.details": "ඔබ නිෂ්පාදනය කරන හෝ සපයන දේ අපට කියන්න", "apply.f.detailsPh": "ඔබේ නිෂ්පාදන/සේවා සහ සාමාන්‍ය ඇණවුම් ප්‍රමාණ පිළිබඳ කෙටි විස්තරයක්",
      "apply.f.submit": "අයදුම්පත ඉදිරිපත් කරන්න",
      "footer.brand": "ගෝලීය වෙළඳාම සඳහා නිර්මාණය කළ වෙළඳපොළ — නිෂ්පාදන, සේවා සහ ලොජිස්ටික්ස්, AI මගින් ගැලපේ.",
      "footer.h1": "වෙළඳපොළ", "footer.products": "නිෂ්පාදන", "footer.services": "සේවා", "footer.suppliers": "සැපයුම්කරුවන්",
      "footer.h2": "සමාගම", "footer.contact": "සම්බන්ධ වන්න",
      "footer.h3": "යාවත්කාලීනව සිටින්න", "footer.newsletter": "මූලාශ්‍ර ඉඟි සහ වේදිකා ප්‍රවෘත්ති, සෑම මසකම.", "footer.emailPh": "ඔබේ ඊමේල්", "footer.join": "එකතු වන්න",
      "footer.rights": "Ometong. සියලුම හිමිකම් ඇවිරිණි.",
      "js.errCompany": "සමාගමේ නම අවශ්‍යයි.", "js.errEmail": "වලංගු ව්‍යාපාරික ඊමේල් එකක් ඇතුළත් කරන්න.", "js.errCategory": "කරුණාකර කාණ්ඩයක් තෝරන්න.",
      "js.errFix": "කරුණාකර සලකුණු කළ ක්ෂේත්‍ර නිවැරදි කරන්න.",
      "js.success": "අයදුම්පත ලැබී ඇත! අපගේ කණ්ඩායම දින 2–3ක් තුළ ඊමේල් මගින් සම්බන්ධ වනු ඇත.",
      "js.subscribed": "ස්තූතියි — ඔබ දායක වී ඇත!"
    }
  };

  function t(key) {
    var lang = document.documentElement.getAttribute("data-lang") || "en";
    var dict = TRANSLATIONS[lang] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

  function applyLanguage(lang) {
    if (!TRANSLATIONS[lang]) lang = "en";
    document.documentElement.setAttribute("data-lang", lang);
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      el.setAttribute("placeholder", t(key));
    });

    var label = document.getElementById("langSwitchLabel");
    if (label) label.textContent = LANG_NAMES[lang] || lang;
    document.querySelectorAll("#langSwitchList li").forEach(function (li) {
      li.classList.toggle("is-active", li.getAttribute("data-lang") === lang);
    });
  }

  function initLanguageSwitcher() {
    var wrap = document.getElementById("langSwitch");
    var btn = document.getElementById("langSwitchBtn");
    var list = document.getElementById("langSwitchList");
    if (!wrap || !btn || !list) return;

    var saved = localStorage.getItem(LANG_STORAGE_KEY);
    var browserLang = (navigator.language || "en").slice(0, 2);
    applyLanguage(saved || (TRANSLATIONS[browserLang] ? browserLang : "en"));

    btn.addEventListener("click", function () {
      var isOpen = wrap.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });

    list.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        applyLanguage(li.getAttribute("data-lang"));
        wrap.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------------------------------------------------------------------
     Shared site chrome
     --------------------------------------------------------------------- */
  function initSharedChrome() {
    var loader = document.getElementById("loader");
    window.addEventListener("load", function () {
      setTimeout(function () { if (loader) loader.classList.add("is-hidden"); }, 250);
    });
    if (document.readyState === "complete" && loader) {
      setTimeout(function () { loader.classList.add("is-hidden"); }, 250);
    }

    var progress = document.getElementById("scrollProgress");
    function updateProgress() {
      if (!progress) return;
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progress.style.width = pct + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();

    var announce = document.getElementById("announce");
    var announceClose = document.getElementById("announceClose");
    if (announce && localStorage.getItem(ANNOUNCE_STORAGE_KEY) === "1") {
      announce.classList.add("is-hidden");
    }
    if (announceClose) {
      announceClose.addEventListener("click", function () {
        announce.classList.add("is-hidden");
        try { localStorage.setItem(ANNOUNCE_STORAGE_KEY, "1"); } catch (e) { /* ignore */ }
      });
    }

    var hamburger = document.getElementById("hamburger");
    var mobileMenu = document.getElementById("mobileMenu");
    if (hamburger && mobileMenu) {
      hamburger.addEventListener("click", function () {
        mobileMenu.classList.toggle("is-open");
        hamburger.classList.toggle("is-active");
      });
    }

    var backTop = document.getElementById("backTop");
    if (backTop) {
      window.addEventListener("scroll", function () {
        if (window.scrollY > 400) backTop.classList.add("is-visible");
        else backTop.classList.remove("is-visible");
      }, { passive: true });
      backTop.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    var yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    var nlForm = document.querySelector(".nl-form");
    if (nlForm) {
      nlForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = nlForm.querySelector("input[type='email']");
        if (input && input.value) {
          input.value = "";
          input.placeholder = t("js.subscribed");
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
     Animated stat counters (hero stat cards)
     --------------------------------------------------------------------- */
  function initStatCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    var animated = new WeakSet();

    function animateCounter(el) {
      if (animated.has(el)) return;
      animated.add(el);
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var duration = 1200;
      var start = null;

      function step(timestamp) {
        if (start === null) start = timestamp;
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(eased * target).toLocaleString("en-US");
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toLocaleString("en-US");
      }
      requestAnimationFrame(step);
    }

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) animateCounter(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { observer.observe(el); });
    } else {
      counters.forEach(animateCounter); // fallback: animate immediately
    }
  }

  /* ---------------------------------------------------------------------
     Testimonial slider dots
     --------------------------------------------------------------------- */
  function initTestimonialSlider() {
    var track = document.getElementById("testiTrack");
    var dotsWrap = document.getElementById("testiDots");
    if (!track || !dotsWrap) return;

    var cards = track.querySelectorAll(".testi-card");
    dotsWrap.innerHTML = "";

    cards.forEach(function (card, i) {
      var dot = document.createElement("span");
      if (i === 0) dot.classList.add("is-active");
      dot.addEventListener("click", function () {
        card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
      });
      dotsWrap.appendChild(dot);
    });

    var dots = dotsWrap.querySelectorAll("span");

    track.addEventListener("scroll", function () {
      var index = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach(function (dot, i) {
        dot.classList.toggle("is-active", i === index);
      });
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     FAQ accordion
     --------------------------------------------------------------------- */
  function initFaqAccordion() {
    var items = document.querySelectorAll("#faqList .faq-item");
    if (!items.length) return;

    items.forEach(function (item) {
      var question = item.querySelector(".faq-question");
      if (!question) return;
      question.addEventListener("click", function () {
        var isOpen = item.classList.contains("is-open");

        // Close all others (single-open accordion behavior)
        items.forEach(function (other) {
          other.classList.remove("is-open");
          var otherQ = other.querySelector(".faq-question");
          if (otherQ) otherQ.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
          item.classList.add("is-open");
          question.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Supplier application (lead) form
     --------------------------------------------------------------------- */
  function initApplyForm() {
    var form = document.getElementById("applyForm");
    var msgEl = document.getElementById("applyFormMsg");
    if (!form) return;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearFieldErrors(form);

      var companyName = form.querySelector("#companyName");
      var contactEmail = form.querySelector("#contactEmail");
      var category = form.querySelector("#category");
      var details = form.querySelector("#details");

      var isValid = true;

      if (!companyName.value.trim()) {
        setFieldError(companyName, t("js.errCompany"));
        isValid = false;
      }
      if (!contactEmail.value.trim() || !isValidEmail(contactEmail.value.trim())) {
        setFieldError(contactEmail, t("js.errEmail"));
        isValid = false;
      }
      if (!category.value) {
        setFieldError(category, t("js.errCategory"));
        isValid = false;
      }

      if (!isValid) {
        showFormMsg(t("js.errFix"), false);
        return;
      }

      var lead = {
        companyName: companyName.value.trim(),
        contactEmail: contactEmail.value.trim(),
        category: category.value,
        details: details.value.trim(),
        submittedAt: new Date().toISOString()
      };
      saveLead(lead);

      form.reset();
      showFormMsg(t("js.success"), true);
    });
  }

  function setFieldError(fieldEl, message) {
    var row = fieldEl.closest(".form-row");
    if (!row) return;
    row.classList.add("has-error");
    var errorEl = row.querySelector(".form-row-error");
    if (!errorEl) {
      errorEl = document.createElement("span");
      errorEl.className = "form-row-error";
      row.appendChild(errorEl);
    }
    errorEl.textContent = message;
  }

  function clearFieldErrors(form) {
    form.querySelectorAll(".form-row.has-error").forEach(function (row) {
      row.classList.remove("has-error");
    });
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function saveLead(lead) {
    var leads = [];
    try {
      var raw = localStorage.getItem(LEADS_STORAGE_KEY);
      if (raw) leads = JSON.parse(raw);
    } catch (e) { leads = []; }
    leads.push(lead);
    try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch (e) { /* storage unavailable */ }
  }

  function showFormMsg(message, success) {
    var msgEl = document.getElementById("applyFormMsg");
    if (!msgEl) return;
    msgEl.textContent = message;
    msgEl.classList.toggle("is-success", !!success);
    msgEl.classList.toggle("is-error", !success);
  }

})();