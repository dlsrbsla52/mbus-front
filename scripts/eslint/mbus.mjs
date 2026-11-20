import uiApiBoundary from "./ui-api.mjs";

// Only match names visible in the source. A computed identifier is a variable.
function staticName(node, computed) {
  if (!computed && node?.type === "Identifier") return node.name;
  if (node?.type === "Literal") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
}

function memberName(node) {
  return staticName(node.property, node.computed);
}

function isBrowserStorage(node) {
  let name;
  if (node.type === "Identifier") {
    name = node.name;
  } else if (node.type === "MemberExpression" && node.object.type === "Identifier"
    && ["window", "globalThis", "self"].includes(node.object.name)) {
    name = memberName(node);
  }
  return name === "localStorage" || name === "sessionStorage";
}

function isAccessTokenKey(key) {
  return typeof key === "string" && /^access[-_]?token$/i.test(key);
}

const noStoredAccessToken = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      memory: "accessToken은 store/useAuthStore.ts의 setTokens로 메모리에 보관하세요. 새로고침 복원은 components/auth/AuthGate.tsx가 처리합니다.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const method = node.callee;
        if (method.type === "MemberExpression" && isBrowserStorage(method.object)
          && memberName(method) === "setItem" && isAccessTokenKey(staticName(node.arguments[0], true))) {
          context.report({ node, messageId: "memory" });
        }
      },
      AssignmentExpression(node) {
        const target = node.left;
        if (target.type === "MemberExpression" && isBrowserStorage(target.object)
          && isAccessTokenKey(memberName(target))) {
          context.report({ node, messageId: "memory" });
        }
      },
    };
  },
};

const noInternalApiPath = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      internal: "S2S 전용 경로입니다. 화면에 맞는 도메인 서비스를 확인하세요. 관리자 API 예시는 lib/api/admin/reservation.ts에 있습니다.",
    },
  },
  create(context) {
    function check(node, value) {
      if (typeof value === "string" && /^(?:https?:\/\/[^/]+)?\/api\/v1\/internal(?:[/?#]|$)/i.test(value)) {
        context.report({ node, messageId: "internal" });
      }
    }
    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.cooked);
      },
    };
  },
};

const mbus = {
  rules: {
    "ui-api-boundary": uiApiBoundary,
    "no-stored-access-token": noStoredAccessToken,
    "no-internal-api-path": noInternalApiPath,
  },
};

export default mbus;
