import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));

const publicServices = new Map([
  ["lib/api/stop", ["StopService", "AdminStopService.list()"]],
  ["lib/api/member", ["MemberService", "AdminMemberService"]],
  ["lib/api/contract", ["ContractService", "AdminContractService"]],
  ["lib/api/reservation", ["ReservationService", "AdminReservationService"]],
]);

// Match the root alias and relative paths against the same project module.
function moduleId(source, context) {
  let id = source;
  if (source.startsWith("@/")) {
    id = path.normalize(source.slice(2));
  } else if (source.startsWith(".")) {
    const absolute = path.resolve(path.dirname(context.filename), source);
    id = path.relative(projectRoot, absolute);
  }
  return id.split(path.sep).join("/").replace(/\.[cm]?[jt]sx?$/, "");
}

function runtimeNames(node) {
  if (node.importKind === "type" || node.exportKind === "type") return [];
  if (!node.specifiers?.length) return ["*"];
  return node.specifiers
    .filter((s) => s.importKind !== "type" && s.exportKind !== "type")
    .map((s) => {
      if (s.type === "ImportSpecifier") return s.imported.name ?? s.imported.value;
      if (s.type === "ExportSpecifier") return s.local.name ?? s.local.value;
      return "*";
    });
}

const uiApiBoundary = {
  meta: {
    type: "problem",
    schema: [{ enum: ["manager", "public"] }],
    messages: {
      transport: "화면의 백엔드 요청은 lib/api의 도메인 서비스를 통해 호출하세요.",
      publicService: "관리자 화면에서는 {{replacement}}를 사용하세요. 정류소 예시는 lib/api/admin/stop.ts에 있습니다.",
      adminService: "일반 화면은 공개 서비스를 사용하세요. 정류소 목록은 lib/api/stop.ts의 StopService.list()입니다.",
    },
  },
  create(context) {
    const manager = context.options[0] === "manager";

    function checkModule(node, source) {
      if (typeof source !== "string") return;
      const id = moduleId(source, context);
      const names = runtimeNames(node);
      if (!names.length) return;

      if (id === "axios" || id.startsWith("axios/") || id === "lib/api/client" || id === "lib/api/swr") {
        context.report({ node, messageId: "transport" });
        return;
      }
      const service = publicServices.get(id);
      if (manager && service && (names.includes(service[0]) || names.includes("*"))) {
        context.report({ node, messageId: "publicService", data: { replacement: service[1] } });
      } else if (!manager && id.startsWith("lib/api/admin/")) {
        context.report({ node, messageId: "adminService" });
      }
    }

    function checkSource(node) {
      checkModule(node, node.source?.value);
    }

    function checkPath(node, value) {
      if (typeof value === "string" && /^(?:https?:\/\/[^/]+)?\/api\/v1(?:[/?#]|$)/.test(value)) {
        context.report({ node, messageId: "transport" });
      }
    }

    return {
      ImportDeclaration: checkSource,
      ExportNamedDeclaration: checkSource,
      ExportAllDeclaration: checkSource,
      ImportExpression(node) {
        const source = node.source;
        checkModule(node, source.type === "TemplateLiteral" && !source.expressions.length
          ? source.quasis[0].value.cooked : source.value);
      },
      CallExpression(node) {
        if (node.callee.type === "Identifier" && node.callee.name === "require") {
          checkModule(node, node.arguments[0]?.value);
        }
      },
      Literal(node) {
        checkPath(node, node.value);
      },
      TemplateElement(node) {
        checkPath(node, node.value.cooked);
      },
    };
  },
};

export default uiApiBoundary;
