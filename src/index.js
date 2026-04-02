import "dotenv/config";
import { buildXml } from "./build-xml.js";

async function main() {
  const demoItems = [
    {
      id: "teste-001",
      title: "Produto de teste",
      description: "Produto usado apenas para validar a geração do XML",
      availability: "in stock",
      condition: "new",
      price: "99.90",
      salePrice: null,
      link: "https://www.sualoja.com.br/produtos/produto-teste",
      imageLink: "https://via.placeholder.com/1200x1200.png?text=Produto+Teste",
      brand: process.env.DEFAULT_BRAND || "Minha Marca",
      itemGroupId: null
    }
  ];

  console.log("Gerando XML de teste...");
  const outputFile = await buildXml(demoItems);
  console.log(`Arquivo gerado com sucesso em: ${outputFile}`);
}

main().catch((error) => {
  console.error("Erro ao gerar XML:", error);
  process.exit(1);
});
