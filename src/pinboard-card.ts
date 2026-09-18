import { PinboardCard } from "./card";
import { PinboardCardEditor } from "./editor";
import { CARD_DESCRIPTION, CARD_NAME, CARD_TYPE, DOCUMENTATION_URL, EDITOR_TYPE, VERSION } from "./const";

if (!customElements.get(CARD_TYPE)) {
  customElements.define(CARD_TYPE, PinboardCard);
}
if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, PinboardCardEditor);
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: CARD_NAME,
    description: CARD_DESCRIPTION,
    preview: true,
    documentationURL: DOCUMENTATION_URL,
  });
}

console.info(
  `%c Pinboard %c ${VERSION} `,
  "color: #fff; background: #2c5364; font-weight: 600; border-radius: 4px 0 0 4px; padding: 2px 6px;",
  "color: #2c5364; background: #e6f0f3; font-weight: 500; border-radius: 0 4px 4px 0; padding: 2px 6px;",
);

export { PinboardCard, PinboardCardEditor };
