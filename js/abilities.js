const CHARACTER_FILES_PATH = "./json/character-groups.json";

document.addEventListener("DOMContentLoaded", () => {
  initAbilitiesTable();
});

async function initAbilitiesTable() {
  const tableBody = document.getElementById("abilityTableBody");
  const countArea = document.getElementById("abilityCount");

  try {
    const characters = await loadAllCharacters();

    const rows = characters
      .map(character => ({
        id: character.id,
        name: character.name,
        abilities: getValueByPath(character, "world.abilities"),
        groupName: character.groupName
      }))
      .filter(character => !isEmptyValue(character.name));

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="2">表示できるキャラクターがいません。</td>
        </tr>
      `;
      countArea.textContent = "";
      return;
    }

    tableBody.innerHTML = rows
      .map(character => createAbilityRowHtml(character))
      .join("");

    //countArea.textContent = `${rows.length}件`;
  } catch (error) {
    console.error(error);

    tableBody.innerHTML = `
      <tr>
        <td colspan="2">読み込みに失敗しました。JSONのパスや書式を確認してください。</td>
      </tr>
    `;

    countArea.textContent = "";
  }
}

async function loadAllCharacters() {
  const files = await fetchJson(CHARACTER_FILES_PATH);

  const characterGroups = await Promise.all(
    files.map(async group => {
      const characters = await fetchJson(group.file);

      return characters.map(character => ({
        ...character,
        groupId: group.id,
        groupName: group.name
      }));
    })
  );

  return characterGroups.flat();
}

async function fetchJson(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`JSONを読み込めませんでした: ${path}`);
  }

  return await response.json();
}

function createAbilityRowHtml(character) {
  const characterUrl = `charadetail.html?id=${encodeURIComponent(character.id)}`;

  return `
    <tr>
      <th scope="row">
        <a href="${escapeAttribute(characterUrl)}">
          ${escapeHtml(character.name)}
        </a>
      </th>
      <td>
        ${formatAbilities(character.abilities)}
      </td>
    </tr>
  `;
}

function formatAbilities(value) {
  if (isEmptyValue(value)) {
    return `<p class="empty-text">-</p>`;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => String(item ?? "").trim())
      .filter(item => item !== "")
      .map(item => `<p>${escapeHtml(item)}</p>`)
      .join("");
  }

  return `<p>${escapeHtml(value)}</p>`;
}

function getValueByPath(object, path) {
  return path.split(".").reduce((current, key) => {
    if (current === undefined || current === null) {
      return undefined;
    }

    return current[key];
  }, object);
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