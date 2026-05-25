const CHARACTER_FILES_PATH = "./json/character-groups.json";
const CHARACTER_INDEX_PATH = "./json/character-index.json";
const WORKS_PATH = "./json/works.json";

// 作品名JSON読み込み
let worksMap = new Map();

async function loadWorksMap() {
  const works = await fetchJson(WORKS_PATH);

  worksMap = new Map(
    works.map(work => [work.id, work])
  );
}

const EDIT_PASSWORD = "Tozai_Ikukyo"; // 編集パスワード

let currentCharacter = null;
let currentGroup = null;
let currentGroupCharacters = [];
let currentGroupFile = "";

// キャラ詳細フィールド
const fieldGroups = [
  {
    title: "基本情報",
    fields: [
      { label: "このページの更新日", key: "updateat" },
      { label: "キャラ名", key: "name" },
      { label: "ふりがな", key: "kana" },
      { label: "担当者", key: "owner" },
      { label: "元のキャラクター", key: "originalCharacter" },
      { label: "ピクシブ百科事典", key: "wikiurl", type: "link" }
    ]
  },
  {
    title: "プロフィール",
    fields: [
      { label: "性別", key: "basic.gender" },
      { label: "年齢", key: "basic.age" },
      { label: "誕生日", key: "basic.birthday" },
      { label: "身長", key: "basic.height" },
      { label: "体重", key: "basic.weight" }
    ]
  },
  {
    title: "人物",
    fields: [
      { label: "職業", key: "personal.job" },
      { label: "趣味/特技", key: "personal.hobbiesAndSkills" },
      { label: "一人称", key: "personal.firstPerson" },
      { label: "二人称", key: "personal.secondPerson" },
      { label: "三人称", key: "personal.thirdPerson" },
      { label: "好きなもの", key: "personal.likes" },
      { label: "嫌いなもの", key: "personal.dislikes" }
    ]
  },
  {
    title: "世界観情報",
    fields: [
      { label: "種族", key: "world.species" },
      { label: "二つ名", key: "world.alias", type: "list" },
      { label: "能力", key: "world.abilities" },
      { label: "主な活動場所", key: "world.mainLocations", type: "list" },
      { label: "危険度", key: "world.dangerLevel" },
      { label: "人間友好度", key: "world.humanFriendliness" },
      { label: "嘘テーマ曲", key: "world.songs", type: "list" },
      { label: "元ネタ", key: "world.originalsourse" }
    ]
  }
];

document.addEventListener("DOMContentLoaded", () => {
  initCharacterDetail();
});

async function initCharacterDetail() {
  const detailArea = document.getElementById("characterDetail");
  const pageTitle = document.getElementById("characterPageTitle");

  try {
    await loadWorksMap();

    const characterId = getCharacterIdFromUrl();

    if (!characterId) {
      detailArea.innerHTML = createMessageHtml("キャラクターIDが指定されていません。");
      return;
    }

    const character = await findCharacterById(characterId);

    if (!character) {
      detailArea.innerHTML = createMessageHtml("キャラクターが見つかりませんでした。");
      return;
    }

    document.title = `${character.name} | キャラクター詳細`;
    pageTitle.textContent = character.name;

    detailArea.innerHTML = createCharacterHtml(character);
    setupEditUI();
    
  } catch (error) {
    console.error(error);
    detailArea.innerHTML = createMessageHtml("読み込みに失敗しました。JSONのパスや書式を確認してください。");
  }
}

function getCharacterIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function getValueByPath(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    return current[key];
  }, object);
}

async function findCharacterById(characterId) {
  const characterFromIndex = await findCharacterByIdFromIndex(characterId);

  if (characterFromIndex) {
    return characterFromIndex;
  }

  return await findCharacterByIdFromGroups(characterId);
}

async function findCharacterByIdFromIndex(characterId) {
  try {
    const characterIndex = await fetchJson(CHARACTER_INDEX_PATH);
    const group = characterIndex[characterId];

    if (!group || !group.file) {
      return null;
    }

    const characters = await fetchJson(group.file);
    const character = characters.find(item => item.id === characterId);

    if (!character) {
      return null;
    }

    return setCurrentCharacter(character, group, characters);
  } catch (error) {
    console.warn("Character index could not be used. Falling back to full scan.", error);
    return null;
  }
}

async function findCharacterByIdFromGroups(characterId) {
  const files = await fetchJson(CHARACTER_FILES_PATH);

  for (const group of files) {
    const characters = await fetchJson(group.file);
    const character = characters.find(item => item.id === characterId);

    if (character) {
      return setCurrentCharacter(character, group, characters);
    }
  }

  return null;
}

function setCurrentCharacter(character, group, characters) {
  currentCharacter = {
    ...character,
    groupId: group.id,
    groupName: group.name
  };

  currentGroup = group;
  currentGroupCharacters = characters;
  currentGroupFile = group.file;

  return currentCharacter;
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`JSONを読み込めませんでした: ${path}`);
  }

  return await response.json();
}

function createCharacterHtml(character) {
  const profileHtml = fieldGroups
    .map(group => createContentBlockHtml(group.title, group.fields, character))
    .filter(Boolean)
    .join("");

  const detailsHtml = createDetailsHtml(character.details);

  return `
    <button type="button" class="edit-open-button" id="editOpenButton">
      このキャラクターを編集
    </button>

    <div class="character-contents">
      ${profileHtml}
      ${detailsHtml}
    </div>
  `;
}

// section生成
function createContentBlockHtml(title, fields, character) {
  const rowsHtml = fields
    .map(field => createFieldRowHtml(field, character))
    .filter(Boolean)
    .join("");

  if (!rowsHtml) {
    return "";
  }

  return `
    <section class="content-card">
      <h3>${escapeHtml(title)}</h3>
      <dl class="profile-list">
        ${rowsHtml}
      </dl>
    </section>
  `;
}

// プロフィールリスト生成
function createFieldRowHtml(field, character) {
  const value = getValueByPath(character, field.key);

  if (isEmptyValue(value)) {
    return "";
  }

  const formattedValue = formatValue(value, field);

  if (!formattedValue.trim()) {
    return "";
  }

  return `
    <div class="profile-row">
      <dt>${escapeHtml(field.label)}</dt>
      <dd>${formattedValue}</dd>
    </div>
  `;
}

function formatValue(value, field) {
  if (field.type === "link") {
    return createLinkHtml(value);
  }

  if (Array.isArray(value)) {
    return createParagraphsHtml(value);
  }

  const replacedValue = replaceWorkTokens(value);
  const text = String(replacedValue ?? "").trim();

  if (text === "") {
    return "";
  }

  return `<p>${escapeHtml(text)}</p>`;
}

function createParagraphsHtml(values) {
  if (!Array.isArray(values)) {
    return "";
  }

  return values
    .map(value => String(value ?? "").trim())
    .filter(value => value !== "")
    .map(value => `<p>${escapeHtml(replaceWorkTokens(value))}</p>`)
    .join("");
}

function createLinkHtml(value) {
  if (!value) {
    return "";
  }

  const url = String(value);

  return `
    <a href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">
      ${escapeHtml(url)}
    </a>
  `;
}

function createListHtml(value) {
  if (!Array.isArray(value)) {
    return `<p>${escapeHtml(value)}</p>`;
  }

  return value
    .filter(item => !isEmptyValue(item))
    .map(item => `<p>${escapeHtml(item)}</p>`)
    .join("");
}

function createDetailsHtml(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return "";
  }

  return details
    .map(detail => {
      const title = String(detail.title ?? "").trim();
      const bodyHtml = formatDetailBody(detail.body);

      if (!title && !bodyHtml) {
        return "";
      }

      return `
        <section class="content-card detail-card">
          ${title ? `<h3>${escapeHtml(title)}</h3>` : ""}
          ${bodyHtml ? `<div class="markdown-body">${bodyHtml}</div>` : ""}
        </section>
      `;
    })
    .filter(html => html.trim() !== "")
    .join("");
}

function formatDetailBody(body) {
  if (Array.isArray(body)) {
    return body
      .map(value => replaceWorkTokens(value))
      .map(value => String(value ?? "").trim())
      .filter(value => value !== "")
      .map(value => markdownToSafeHtml(value))
      .filter(html => html && !isEmptyHtml(html))
      .join("");
  }

  const text = String(replaceWorkTokens(body) ?? "").trim();

  if (text === "") {
    return "";
  }

  const html = markdownToSafeHtml(text);

  if (!html || isEmptyHtml(html)) {
    return "";
  }

  return html;
}

function isEmptyHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = html;

  return template.content.textContent.trim() === "";
}

function isEmptyValue(value) {
  if (value === undefined || value === null) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(item => isEmptyValue(item));
  }

  if (typeof value === "string" && value.trim() === "") {
    return true;
  }

  return false;
}

function markdownToSafeHtml(text) {
  const markdownText = String(text ?? "");

  if (typeof marked === "undefined" || typeof DOMPurify === "undefined") {
    return escapeHtml(markdownText).replaceAll("\n", "<br>");
  }

  const rawHtml = marked.parse(markdownText);
  return DOMPurify.sanitize(rawHtml);
}

function createMessageHtml(message) {
  return `
    <section class="content-card">
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

function isEmptyValue(value) {
  if (value === undefined || value === null) {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  if (typeof value === "string" && value.trim() === "") {
    return true;
  }

  return false;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function replaceWorkTokens(text) {
  return String(text ?? "").replace(
    /\{\{work:([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\}\}/g,
    (match, workId, fieldName) => {
      const work = worksMap.get(workId);

      if (!work) {
        return match;
      }

      if (fieldName === "id" || fieldName === "original") {
        return match;
      }

      const value = work[fieldName];

      if (value === undefined || value === null || String(value).trim() === "") {
        return match;
      }

      return String(value);
    }
  );
}






// #########################################################################################
// 編集フォーム
// #########################################################################################
function setupEditUI() {
  const editOpenButton = document.getElementById("editOpenButton");
  const editModal = document.getElementById("editModal");
  const editModalOverlay = document.getElementById("editModalOverlay");
  const editModalClose = document.getElementById("editModalClose");
  const passwordArea = document.getElementById("editPasswordArea");
  const passwordInput = document.getElementById("editPasswordInput");
  const passwordButton = document.getElementById("editPasswordButton");
  const passwordMessage = document.getElementById("editPasswordMessage");
  const editForm = document.getElementById("characterEditForm");
  const editFormFields = document.getElementById("editFormFields");
  const downloadJsonButton = document.getElementById("downloadJsonButton");
  const copyJsonButton = document.getElementById("copyJsonButton");
  const outputMessage = document.getElementById("editOutputMessage");

  if (!editOpenButton || !editModal) {
    return;
  }

  editOpenButton.addEventListener("click", () => {
    editModal.hidden = false;
    passwordArea.hidden = false;
    editForm.hidden = true;
    passwordInput.value = "";
    passwordMessage.textContent = "";
    outputMessage.textContent = "";
    passwordInput.focus();
  });

  editModalOverlay.addEventListener("click", closeEditModal);
  editModalClose.addEventListener("click", closeEditModal);

  passwordButton.addEventListener("click", () => {
    if (passwordInput.value !== EDIT_PASSWORD) {
      passwordMessage.textContent = "パスワードが違います。";
      return;
    }

    passwordArea.hidden = true;
    editForm.hidden = false;
    editFormFields.innerHTML = createEditFormHtml(currentCharacter);
    setupDetailsEditor();
  });

  passwordInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      passwordButton.click();
    }
  });

  downloadJsonButton.addEventListener("click", () => {
    const updatedCharacters = createUpdatedGroupCharacters();
    const jsonText = JSON.stringify(updatedCharacters, null, 2);

    downloadTextFile(getFileNameFromPath(currentGroupFile), jsonText);
    outputMessage.textContent = "JSONファイルを出力しました。";
  });

  copyJsonButton.addEventListener("click", async () => {
    const updatedCharacters = createUpdatedGroupCharacters();
    const jsonText = JSON.stringify(updatedCharacters, null, 2);

    try {
      await navigator.clipboard.writeText(jsonText);
      outputMessage.textContent = "JSONをクリップボードにコピーしました。";
    } catch (error) {
      console.error(error);
      outputMessage.textContent = "コピーに失敗しました。JSON出力を使ってください。";
    }
  });

  function closeEditModal() {
    editModal.hidden = true;
  }
}

function createEditFormHtml(character) {
  return `
    <section class="edit-section">
      <h3>管理情報</h3>

      ${createReadonlyField("ID", "id", character.id)}
      ${createInputField("キャラ名", "name", character.name)}
      ${createInputField("ふりがな", "kana", character.kana)}
      ${createInputField("担当者", "owner", character.owner)}
      ${createInputField("元のキャラクター", "originalCharacter", character.originalCharacter)}
      ${createInputField("ピクシブ百科事典", "wikiurl", character.wikiurl)}
    </section>

    <section class="edit-section">
      <h3>プロフィール</h3>

      ${createInputField("性別", "basic.gender", getValueByPath(character, "basic.gender"))}
      ${createInputField("年齢", "basic.age", getValueByPath(character, "basic.age"))}
      ${createInputField("誕生日", "basic.birthday", getValueByPath(character, "basic.birthday"))}
      ${createInputField("身長", "basic.height", getValueByPath(character, "basic.height"))}
      ${createInputField("体重", "basic.weight", getValueByPath(character, "basic.weight"))}
    </section>

    <section class="edit-section">
      <h3>人物</h3>

      ${createInputField("職業", "personal.job", getValueByPath(character, "personal.job"))}
      ${createTextareaField("趣味/特技", "personal.hobbiesAndSkills", getValueByPath(character, "personal.hobbiesAndSkills"))}
      ${createInputField("一人称", "personal.firstPerson", getValueByPath(character, "personal.firstPerson"))}
      ${createInputField("二人称", "personal.secondPerson", getValueByPath(character, "personal.secondPerson"))}
      ${createInputField("三人称", "personal.thirdPerson", getValueByPath(character, "personal.thirdPerson"))}
      ${createTextareaField("好きなもの", "personal.likes", getValueByPath(character, "personal.likes"))}
      ${createTextareaField("嫌いなもの", "personal.dislikes", getValueByPath(character, "personal.dislikes"))}
    </section>

    <section class="edit-section">
      <h3>世界観情報</h3>

      ${createInputField("種族", "world.species", getValueByPath(character, "world.species"))}
      ${createTextareaField("二つ名", "world.alias", getValueByPath(character, "world.alias"), "1行につき1項目")}
      ${createTextareaField("能力", "world.abilities", getValueByPath(character, "world.abilities"))}
      ${createTextareaField("主な活動場所", "world.mainLocations", getValueByPath(character, "world.mainLocations"), "1行につき1項目")}
      ${createInputField("危険度", "world.dangerLevel", getValueByPath(character, "world.dangerLevel"))}
      ${createInputField("人間友好度", "world.humanFriendliness", getValueByPath(character, "world.humanFriendliness"))}
      ${createTextareaField("嘘テーマ曲", "world.songs", getValueByPath(character, "world.songs"), "1行につき1項目")}
      ${createTextareaField("元ネタ", "world.originalsourse", getValueByPath(character, "world.originalsourse"))}
    </section>

    <section class="edit-section">
      <h3>詳細な設定</h3>
      <p class="edit-note">本文は1行につき1段落として保存されます。</p>

      <div id="detailsEditArea">
        ${createDetailsEditHtml(character.details)}
      </div>

      <button type="button" class="edit-button edit-button--sub" id="addDetailButton">
        詳細項目を追加
      </button>
    </section>
  `;
}

function setupDetailsEditor() {
  const addDetailButton = document.getElementById("addDetailButton");
  const detailsEditArea = document.getElementById("detailsEditArea");

  if (!addDetailButton || !detailsEditArea) {
    return;
  }

  addDetailButton.addEventListener("click", () => {
    detailsEditArea.insertAdjacentHTML(
      "beforeend",
      createDetailEditItemHtml("", "")
    );
  });

  detailsEditArea.addEventListener("click", event => {
    const deleteButton = event.target.closest("[data-delete-detail]");

    if (!deleteButton) {
      return;
    }

    const item = deleteButton.closest(".detail-edit-item");

    if (item) {
      item.remove();
    }
  });
}

function createReadonlyField(label, name, value) {
  return `
    <label class="edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        class="edit-input"
        type="text"
        name="${escapeAttribute(name)}"
        value="${escapeAttribute(value)}"
        readonly
      >
    </label>
  `;
}

function createInputField(label, name, value) {
  return `
    <label class="edit-field">
      <span>${escapeHtml(label)}</span>
      <input
        class="edit-input"
        type="text"
        name="${escapeAttribute(name)}"
        value="${escapeAttribute(value ?? "")}"
      >
    </label>
  `;
}

function createTextareaField(label, name, value, note = "") {
  return `
    <label class="edit-field">
      <span>${escapeHtml(label)}</span>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
      <textarea
        class="edit-textarea"
        name="${escapeAttribute(name)}"
        rows="4"
      >${escapeHtml(valueToTextarea(value))}</textarea>
    </label>
  `;
}

function createDetailsEditHtml(details) {
  if (!Array.isArray(details) || details.length === 0) {
    return createDetailEditItemHtml("", "");
  }

  return details
    .map(detail => createDetailEditItemHtml(detail.title, detail.body))
    .join("");
}

function createDetailEditItemHtml(title, body) {
  return `
    <div class="detail-edit-item">
      <label class="edit-field">
        <span>題名</span>
        <input
          class="edit-input"
          type="text"
          data-detail-title
          value="${escapeAttribute(title ?? "")}"
        >
      </label>

      <label class="edit-field">
        <span>内容</span>
        <textarea
          class="edit-textarea"
          data-detail-body
          rows="8"
        >${escapeHtml(valueToTextarea(body))}</textarea>
      </label>

      <button type="button" class="edit-button edit-button--danger" data-delete-detail>
        この詳細項目を削除
      </button>
    </div>
  `;
}

// フォーム読み取り関数
function createUpdatedCharacterFromForm() {
  const form = document.getElementById("characterEditForm");
  const formData = new FormData(form);

  const updatedCharacter = structuredClone
    ? structuredClone(currentCharacter)
    : JSON.parse(JSON.stringify(currentCharacter));

  setValueByPath(updatedCharacter, "name", formData.get("name"));
  setValueByPath(updatedCharacter, "kana", formData.get("kana"));
  setValueByPath(updatedCharacter, "owner", formData.get("owner"));
  setValueByPath(updatedCharacter, "originalCharacter", formData.get("originalCharacter"));
  setValueByPath(updatedCharacter, "wikiurl", formData.get("wikiurl"));

  setValueByPath(updatedCharacter, "basic.gender", formData.get("basic.gender"));
  setValueByPath(updatedCharacter, "basic.age", formData.get("basic.age"));
  setValueByPath(updatedCharacter, "basic.birthday", formData.get("basic.birthday"));
  setValueByPath(updatedCharacter, "basic.height", formData.get("basic.height"));
  setValueByPath(updatedCharacter, "basic.weight", formData.get("basic.weight"));

  setValueByPath(updatedCharacter, "personal.job", formData.get("personal.job"));
  setValueByPath(updatedCharacter, "personal.hobbiesAndSkills", textareaToTextOrArray(formData.get("personal.hobbiesAndSkills")));
  setValueByPath(updatedCharacter, "personal.firstPerson", formData.get("personal.firstPerson"));
  setValueByPath(updatedCharacter, "personal.secondPerson", formData.get("personal.secondPerson"));
  setValueByPath(updatedCharacter, "personal.thirdPerson", formData.get("personal.thirdPerson"));
  setValueByPath(updatedCharacter, "personal.likes", textareaToTextOrArray(formData.get("personal.likes")));
  setValueByPath(updatedCharacter, "personal.dislikes", textareaToTextOrArray(formData.get("personal.dislikes")));

  setValueByPath(updatedCharacter, "world.species", formData.get("world.species"));
  setValueByPath(updatedCharacter, "world.alias", textareaToArray(formData.get("world.alias")));
  setValueByPath(updatedCharacter, "world.abilities", textareaToText(formData.get("world.abilities")));
  setValueByPath(updatedCharacter, "world.mainLocations", textareaToArray(formData.get("world.mainLocations")));
  setValueByPath(updatedCharacter, "world.dangerLevel", formData.get("world.dangerLevel"));
  setValueByPath(updatedCharacter, "world.humanFriendliness", formData.get("world.humanFriendliness"));
  setValueByPath(updatedCharacter, "world.songs", textareaToText(formData.get("world.songs")));
  setValueByPath(updatedCharacter, "world.originalsourse", textareaToText(formData.get("world.originalsourse")));

  updatedCharacter.details = readDetailsFromForm();

  delete updatedCharacter.groupId;
  delete updatedCharacter.groupName;

  return updatedCharacter;
}

function createUpdatedGroupCharacters() {
  const updatedCharacter = createUpdatedCharacterFromForm();

  return currentGroupCharacters.map(character => {
    if (character.id === updatedCharacter.id) {
      return updatedCharacter;
    }

    return character;
  });
}

function readDetailsFromForm() {
  const detailItems = document.querySelectorAll(".detail-edit-item");

  return Array.from(detailItems)
    .map(item => {
      const titleInput = item.querySelector("[data-detail-title]");
      const bodyInput = item.querySelector("[data-detail-body]");

      const title = String(titleInput?.value ?? "").trim();
      const body = textareaToArray(bodyInput?.value ?? "");

      return {
        title,
        body
      };
    })
    .filter(detail => {
      return detail.title !== "" || detail.body.length > 0;
    });
}

function valueToTextarea(value) {
  if (Array.isArray(value)) {
    return value.join("\n");
  }

  return String(value ?? "");
}

function textareaToArray(value) {
  return String(value ?? "")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");
}

function textareaToText(value) {
  return String(value ?? "").trim();
}

function textareaToTextOrArray(value) {
  const lines = textareaToArray(value);

  if (lines.length === 0) {
    return "";
  }

  if (lines.length === 1) {
    return lines[0];
  }

  return lines;
}

function setValueByPath(object, path, value) {
  const keys = path.split(".");
  const lastKey = keys.pop();

  const target = keys.reduce((current, key) => {
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }

    return current[key];
  }, object);

  target[lastKey] = normalizeValue(value);
}

function normalizeValue(value) {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function downloadTextFile(fileName, text) {
  const blob = new Blob([text], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

function getFileNameFromPath(path) {
  return String(path).split("/").pop() || "characters.json";
}
