/**************************************************
 * だれくる｜KSEC 1st
 * script.js
 **************************************************/

const API_URL =
  "https://script.google.com/macros/s/AKfycbxQ3y-i2Y3WMtXM58xrrWoIjPQ7t0gNudo_YO6hRMg9zF2AyoqrTnZ7Yj_T35nbAJ6zRA/exec";

let eventDates = [];
let members = [];
let participantsData = [];
let answers = {};
let adminPin = "";
let messageTimer = null;

document.addEventListener("DOMContentLoaded", () => {
  setupEvents();
  loadData();
});

/* ==================================================
   イベント設定
================================================== */

function onClickIfExists(id, callback) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("click", callback);
}

function setupEvents() {
  onClickIfExists("submit-button", submitAnswer);
  onClickIfExists("admin-open-button", openAdminPanel);
  onClickIfExists("admin-close-button", closeAdminPanel);
  onClickIfExists("admin-login-button", loginAdmin);
  onClickIfExists("add-date-button", () => openDateModal());
  onClickIfExists("modal-close-button", closeDateModal);
  onClickIfExists("modal-cancel-button", closeDateModal);
  onClickIfExists("modal-save-button", saveDate);
  onClickIfExists("add-member-button", addMemberFromForm);

  const attendanceSelect =
    document.getElementById("attendance-date-select");

  if (attendanceSelect) {
    attendanceSelect.addEventListener(
      "change",
      updateAttendanceView
    );
  }
}

/* ==================================================
   API通信
================================================== */

async function apiGet(params = {}) {
  const url = new URL(API_URL);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "データ取得に失敗しました。"
    );
  }

  return result;
}

async function apiPost(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(
      result.message || "処理に失敗しました。"
    );
  }

  return result;
}

/* ==================================================
   データ読み込み
================================================== */

async function loadData() {
  try {
    const result = await apiGet({ action: "getAll" });

    eventDates = result.dates || [];
    members = result.members || [];
    participantsData = result.participants || [];

    renderMemberSelect();
    renderDateList();

    // 一覧表を削除していてもエラーにならない
    renderParticipants();

    // 集計表示は引き続き行う
    renderSummary();
    loadAttendanceDates();

    if (adminPin) {
      renderAdminDates();
      renderAdminMembers();
    }
  } catch (error) {
    console.error(error);

    showMessage(
      error.message ||
      "データを取得できませんでした。Apps ScriptのURLやデプロイ設定を確認してください。",
      "error"
    );
  }
}

/* ==================================================
   メンバー選択
================================================== */

function renderMemberSelect() {
  const select = document.getElementById("name");
  if (!select) return;

  const previousValue = select.value;
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "名前を選択してください";
  select.appendChild(placeholder);

  members.forEach(member => {
    const option = document.createElement("option");
    option.value = member.name;

    const affiliation = member.affiliation || "未設定";
    option.textContent = `(${affiliation}) ${member.name}`;

    select.appendChild(option);
  });

  if (members.some(member => member.name === previousValue)) {
    select.value = previousValue;
  }

  select.disabled = members.length === 0;

  if (!members.length) {
    placeholder.textContent =
      "登録されているメンバーがいません";
  }
}

/* ==================================================
   日程回答欄
================================================== */

function renderDateList() {
  const container = document.getElementById("date-list");
  if (!container) return;

  container.innerHTML = "";

  if (!eventDates.length) {
    container.innerHTML =
      '<div class="loading">現在、登録されている日程はありません。</div>';
    return;
  }

  eventDates.forEach(event => {
    const item = document.createElement("div");
    item.className = "date-item";

    const currentAnswer = answers[event.id] || "";
    const selectedTime = eventTimeFromAnswer(currentAnswer);

    item.innerHTML = `
      <div class="date-name">
        ${escapeHtml(event.title)}
        <br>
        <small>${escapeHtml(formatDate(event.date))}</small>
      </div>

      <div class="date-answer-controls">
        <div class="date-options">
          <button
            type="button"
            class="choice-button ${
              currentAnswer.startsWith("○") ? "selected-yes" : ""
            }"
            data-date="${escapeHtml(event.id)}"
            data-value="○"
          >○ 参加できる</button>

          <button
            type="button"
            class="choice-button ${
              currentAnswer === "×" ? "selected-no" : ""
            }"
            data-date="${escapeHtml(event.id)}"
            data-value="×"
          >× 参加できない</button>
        </div>

        <div class="attendance-time-area">
          <label for="time-${escapeHtml(event.id)}">
            参加できる時間
          </label>

          <select
            id="time-${escapeHtml(event.id)}"
            class="attendance-time-select"
            data-date="${escapeHtml(event.id)}"
          >
            <option value="終日"
              ${selectedTime === "終日" ? "selected" : ""}>
              終日
            </option>

            <option value="午前まで"
              ${selectedTime === "午前まで" ? "selected" : ""}>
              午前まで
            </option>

            <option value="午後から"
              ${selectedTime === "午後から" ? "selected" : ""}>
              午後から
            </option>
          </select>
        </div>
      </div>
    `;

    container.appendChild(item);
  });

  container.querySelectorAll(".choice-button").forEach(button => {
    button.addEventListener("click", () => {
      const dateId = button.dataset.date;
      const value = button.dataset.value;

      answers[dateId] = value;

      container.querySelectorAll(".choice-button").forEach(btn => {
        if (btn.dataset.date !== dateId) return;
        btn.classList.remove("selected-yes", "selected-no");
      });

      button.classList.add(
        value === "○" ? "selected-yes" : "selected-no"
      );
    });
  });
}

function eventTimeFromAnswer(answer) {
  if (typeof answer !== "string" || !answer.startsWith("○|")) {
    return "終日";
  }

  const time = answer.slice(2);

  const allowed = [
    "終日",
    "午前まで",
    "午後から"
  ];

  return allowed.includes(time)
    ? time
    : "終日";
}

/* ==================================================
   回答登録
================================================== */

async function submitAnswer() {
  const nameElement = document.getElementById("name");
  if (!nameElement) return;

  const name = nameElement.value;

  if (!name) {
    showMessage("名前を選択してください。", "error");
    return;
  }

  if (!eventDates.length) {
    showMessage("登録できる日程がありません。", "error");
    return;
  }

  const selectedAnswers = {};

  eventDates.forEach(event => {
    const answer = answers[event.id];

    if (answer === "×") {
      selectedAnswers[event.id] = "×";
    } else if (answer === "○") {
      const timeSelect = document.querySelector(
        `.attendance-time-select[data-date="${CSS.escape(event.id)}"]`
      );

      const time = timeSelect
        ? timeSelect.value
        : "終日";

      selectedAnswers[event.id] = `○|${time}`;
    }
  });

  if (Object.keys(selectedAnswers).length === 0) {
    showMessage(
      "少なくとも1日程の参加可否を選択してください。",
      "error"
    );
    return;
  }

  const button = document.getElementById("submit-button");
  if (!button) return;

  const label = button.querySelector("span:first-child");
  button.disabled = true;

  if (label) label.textContent = "登録中…";

  try {
    await apiPost({
      action: "saveParticipation",
      name,
      answers: selectedAnswers
    });

    showMessage("参加状況を登録しました！", "success");

    answers = {};
    await loadData();

    const select = document.getElementById("name");
    if (select) select.value = name;
  } catch (error) {
    console.error(error);
    showMessage(
      error.message || "登録に失敗しました。",
      "error"
    );
  } finally {
    button.disabled = false;
    if (label) label.textContent = "登録する";
  }
}

/* ==================================================
   参加者一覧テーブル
   ★ HTMLから削除済みの場合は何もしない
================================================== */

function renderParticipants() {
  const header = document.getElementById("table-header");
  const body = document.getElementById("table-body");

  // 一覧表がHTMLにない場合は描画をスキップ
  if (!header || !body) {
    return;
  }

  header.innerHTML = "<th>名前</th>";

  eventDates.forEach(event => {
    const th = document.createElement("th");

    th.innerHTML = `
      ${escapeHtml(event.title)}
      <br>
      <small>${escapeHtml(formatDate(event.date))}</small>
    `;

    header.appendChild(th);
  });

  body.innerHTML = "";

  if (!participantsData.length) {
    body.innerHTML = `
      <tr>
        <td class="table-empty" colspan="${eventDates.length + 1}">
          まだ回答が登録されていません。
        </td>
      </tr>
    `;
    return;
  }

  participantsData.forEach(person => {
    const tr = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.className = "name-cell";
    nameCell.textContent = person.name;
    tr.appendChild(nameCell);

    eventDates.forEach(event => {
      const td = document.createElement("td");
      const value = person.answers?.[event.id] || "";

      if (value === "○" || value.startsWith("○|")) {
        td.textContent = value.startsWith("○|")
          ? `○（${value.slice(2)}）`
          : "○";
        td.className = "answer-yes";
      } else if (value === "×") {
        td.textContent = "×";
        td.className = "answer-no";
      } else {
        td.textContent = "－";
        td.className = "answer-empty";
      }

      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

/* ==================================================
   日程ごとの参加人数集計
================================================== */

function renderSummary() {
  const container = document.getElementById("summary-list");
  if (!container) return;

  container.innerHTML = "";

  if (!eventDates.length) {
    container.innerHTML =
      '<p class="loading">日程がありません。</p>';
    return;
  }

  eventDates.forEach(event => {
    const count = participantsData.filter(person => {
      const value = person.answers?.[event.id] || "";
      return value === "○" || value.startsWith("○|");
    }).length;

    const card = document.createElement("div");
    card.className = "summary-card";

    card.innerHTML = `
      <div class="summary-date">
        ${escapeHtml(event.title)}
        <br>
        ${escapeHtml(formatDate(event.date))}
      </div>

      <div class="summary-count">
        ${count}<span>人が参加可能</span>
      </div>
    `;

    container.appendChild(card);
  });
}

/* ==================================================
   各回の参加状況
================================================== */

function loadAttendanceDates() {
  const select = document.getElementById("attendance-date-select");
  if (!select) return;

  const previousValue = select.value;

  select.innerHTML =
    '<option value="">回を選択してください</option>';

  eventDates.forEach(event => {
    const option = document.createElement("option");
    option.value = event.id;
    option.textContent =
      `${event.title}（${formatDate(event.date)}）`;

    select.appendChild(option);
  });

  if (eventDates.some(event => event.id === previousValue)) {
    select.value = previousValue;
  }

  updateAttendanceView();
}

function updateAttendanceView() {
  const select = document.getElementById("attendance-date-select");
  if (!select) return;

  const dateId = select.value;

  const yes = [];
  const no = [];
  const unanswered = [];
  const answeredNames = new Set();

  if (!dateId) {
    setAttendanceCounts(0, 0, 0);

    renderAttendanceMembers(
      "attendance-yes-list", [], "回を選択してください。"
    );
    renderAttendanceMembers(
      "attendance-no-list", [], "回を選択してください。"
    );
    renderAttendanceMembers(
      "attendance-unanswered-list", [], "回を選択してください。"
    );

    return;
  }

  participantsData.forEach(person => {
    const value = person.answers?.[dateId] || "";

    answeredNames.add(person.name);

    const member = {
      name: person.name,
      affiliation: person.affiliation || "未設定"
    };

    if (value === "○" || value.startsWith("○|")) {
      yes.push({
        ...member,
        time: value.startsWith("○|")
          ? value.slice(2)
          : "終日"
      });
    } else if (value === "×") {
      no.push(member);
    } else {
      unanswered.push(member);
    }
  });

  // 一度も回答を登録していないメンバーも未回答に含める
  members.forEach(member => {
    if (!answeredNames.has(member.name)) {
      unanswered.push(member);
    }
  });

  setAttendanceCounts(
    yes.length,
    no.length,
    unanswered.length
  );

  renderAvailableMembers(yes);

  renderAttendanceMembers(
    "attendance-no-list",
    no,
    "参加不可のメンバーはいません。"
  );

  renderAttendanceMembers(
    "attendance-unanswered-list",
    unanswered,
    "未回答のメンバーはいません。"
  );
}

function setAttendanceCounts(yes, no, unanswered) {
  const yesCount = document.getElementById("attendance-yes-count");
  const noCount = document.getElementById("attendance-no-count");
  const unansweredCount =
    document.getElementById("attendance-unanswered-count");

  if (yesCount) yesCount.textContent = yes;
  if (noCount) noCount.textContent = no;
  if (unansweredCount) unansweredCount.textContent = unanswered;
}

/* ==================================================
   参加可能メンバー：所属別表示
================================================== */

function renderAvailableMembers(list) {
  const container = document.getElementById("attendance-yes-list");
  if (!container) return;

  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "attendance-empty";
    empty.textContent = "参加可能なメンバーはいません。";
    container.appendChild(empty);
    return;
  }

  const groups = [
    { affiliation: "生徒会", members: [] },
    { affiliation: "KSV", members: [] },
    { affiliation: "未設定", members: [] }
  ];

  list.forEach(person => {
    const member = members.find(item => item.name === person.name);
    const affiliation = member?.affiliation || "未設定";

    const group = groups.find(
      item => item.affiliation === affiliation
    );

    if (group) {
      group.members.push(person);
    } else {
      groups[2].members.push(person);
    }
  });

  groups.forEach(group => {
    if (!group.members.length) return;

    const section = document.createElement("div");
    section.className = "attendance-affiliation-group";

    const heading = document.createElement("h4");
    heading.className =
      group.affiliation === "生徒会"
        ? "attendance-group-title affiliation-student"
        : group.affiliation === "KSV"
          ? "attendance-group-title affiliation-ksv"
          : "attendance-group-title affiliation-unknown";

    heading.textContent = group.affiliation;
    section.appendChild(heading);

    group.members.forEach(person => {
      const row = document.createElement("div");
      row.className = "attendance-member";

      const name = document.createElement("span");
      name.textContent = person.name;

      const time = document.createElement("span");
      time.className = "attendance-member-time";
      time.textContent = person.time || "";

      row.append(name, time);
      section.appendChild(row);
    });

    container.appendChild(section);
  });
}

function renderAttendanceMembers(elementId, list, emptyMessage) {
  const container = document.getElementById(elementId);
  if (!container) return;

  container.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "attendance-empty";
    empty.textContent = emptyMessage;
    container.appendChild(empty);
    return;
  }

  list.forEach(item => {
    const row = document.createElement("div");
    row.className = "attendance-member";

    const person = typeof item === "string"
      ? { name: item, affiliation: "未設定" }
      : item;

    const name = document.createElement("span");
    name.textContent = person.name;

    const badge = document.createElement("span");
    const affiliation = person.affiliation || "未設定";

    badge.className = "affiliation-badge";

    if (affiliation === "生徒会") {
      badge.classList.add("affiliation-student");
    } else if (affiliation === "KSV") {
      badge.classList.add("affiliation-ksv");
    } else {
      badge.classList.add("affiliation-unknown");
    }

    badge.textContent = affiliation;

    row.append(name, badge);

    if (person.time) {
      const time = document.createElement("span");
      time.className = "attendance-member-time";
      time.textContent = person.time;
      row.appendChild(time);
    }

    container.appendChild(row);
  });
}

/* ==================================================
   管理者パネル・ログイン
================================================== */

function openAdminPanel() {
  const panel = document.getElementById("admin-panel");
  if (!panel) return;

  panel.classList.add("active");
  panel.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function closeAdminPanel() {
  const panel = document.getElementById("admin-panel");
  if (panel) panel.classList.remove("active");
}

async function loginAdmin() {
  const pinInput = document.getElementById("admin-pin");
  if (!pinInput) return;

  const pin = pinInput.value.trim();

  if (!pin) {
    showAdminMessage("PINを入力してください。", "error");
    return;
  }

  try {
    await apiGet({
      action: "adminLogin",
      pin
    });

    adminPin = pin;

    const login = document.getElementById("admin-login");
    const content = document.getElementById("admin-content");

    if (login) login.classList.add("hidden");
    if (content) content.classList.remove("hidden");

    showAdminMessage("ログインしました。", "success");

    renderAdminDates();
    renderAdminMembers();
  } catch (error) {
    showAdminMessage(
      error.message || "ログインできませんでした。",
      "error"
    );
  }
}

/* ==================================================
   管理者：日程管理
================================================== */

function renderAdminDates() {
  const container = document.getElementById("admin-date-list");
  if (!container) return;

  container.innerHTML = "";

  if (!eventDates.length) {
    container.innerHTML =
      '<p class="loading">登録されている日程はありません。</p>';
    return;
  }

  eventDates.forEach(event => {
    const item = document.createElement("div");
    item.className = "admin-date-item";

    const info = document.createElement("div");
    info.className = "admin-date-info";

    const title = document.createElement("strong");
    title.textContent = event.title;

    const date = document.createElement("span");
    date.textContent = formatDate(event.date);

    info.append(title, date);

    const actions = document.createElement("div");
    actions.className = "admin-date-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit-button";
    edit.textContent = "✏️ 編集";
    edit.addEventListener("click", () => openDateModal(event));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-button";
    del.textContent = "🗑️ 削除";
    del.addEventListener("click", () => deleteDate(event.id));

    actions.append(edit, del);
    item.append(info, actions);
    container.appendChild(item);
  });
}

function openDateModal(event = null) {
  const modal = document.getElementById("date-modal");
  if (!modal) return;

  const modalTitle = document.getElementById("modal-title");
  const idInput = document.getElementById("edit-date-id");
  const dateInput = document.getElementById("event-date");
  const titleInput = document.getElementById("event-title");

  if (modalTitle) {
    modalTitle.textContent = event ? "日程を編集" : "日程を追加";
  }

  if (idInput) idInput.value = event?.id || "";
  if (dateInput) dateInput.value = event?.date || "";
  if (titleInput) titleInput.value = event?.title || "";

  modal.classList.add("active");
}

function closeDateModal() {
  const modal = document.getElementById("date-modal");
  if (modal) modal.classList.remove("active");
}

async function saveDate() {
  const id = document.getElementById("edit-date-id")?.value || "";
  const date = document.getElementById("event-date")?.value || "";
  const title =
    document.getElementById("event-title")?.value.trim() || "";

  if (!date || !title) {
    alert("日程名と開催日を入力してください。");
    return;
  }

  try {
    await apiPost({
      action: id ? "updateDate" : "addDate",
      pin: adminPin,
      id,
      date,
      title
    });

    closeDateModal();
    await loadData();

    showAdminMessage("日程を保存しました。", "success");
  } catch (error) {
    alert(error.message || "日程を保存できませんでした。");
  }
}

async function deleteDate(id) {
  const event = eventDates.find(item => item.id === id);
  if (!event) return;

  if (!confirm(
    `「${event.title}」を削除しますか？\nこの日程の回答も削除されます。`
  )) {
    return;
  }

  try {
    await apiPost({
      action: "deleteDate",
      pin: adminPin,
      id
    });

    await loadData();
    showAdminMessage("日程を削除しました。", "success");
  } catch (error) {
    alert(error.message || "日程を削除できませんでした。");
  }
}

/* ==================================================
   管理者：メンバー管理
================================================== */

async function addMemberFromForm() {
  const input = document.getElementById("new-member-name");
  const affiliationSelect =
    document.getElementById("new-member-affiliation");

  if (!input || !affiliationSelect) return;

  const name = input.value.trim();
  const affiliation = affiliationSelect.value;

  if (!name) {
    alert("生徒氏名を入力してください。");
    return;
  }

  try {
    await apiPost({
      action: "addMember",
      pin: adminPin,
      name,
      affiliation
    });

    input.value = "";

    await loadData();

    showAdminMessage("メンバーを追加しました。", "success");

  } catch (error) {
    alert(error.message || "メンバーを追加できませんでした。");
  }
}


function renderAdminMembers() {
  const container = document.getElementById("admin-member-list");
  if (!container) return;

  container.innerHTML = "";

  if (!members.length) {
    container.innerHTML =
      '<p class="loading">メンバーが登録されていません。</p>';
    return;
  }

  members.forEach(member => {
    const item = document.createElement("div");
    item.className = "admin-member-item";

    const info = document.createElement("div");
    info.className = "admin-member-info";

    const label = document.createElement("strong");
    label.textContent = member.name;

    const affiliation = member.affiliation || "未設定";

    const badge = document.createElement("span");
    badge.className = "affiliation-badge";

    if (affiliation === "生徒会") {
      badge.classList.add("affiliation-student");
    } else if (affiliation === "KSV") {
      badge.classList.add("affiliation-ksv");
    } else {
      badge.classList.add("affiliation-unknown");
    }

    badge.textContent = affiliation;

    info.append(label, badge);

    const controls = document.createElement("div");
    controls.className = "admin-member-controls";

    const select = document.createElement("select");

    [
      "生徒会",
      "KSV",
      "未設定"
    ].forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    select.value = affiliation;

    const save = document.createElement("button");
    save.type = "button";
    save.className = "edit-button";
    save.textContent = "所属を保存";

    save.addEventListener("click", () => {
      updateMemberAffiliation(member.name, select.value);
    });

    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "edit-button";
    edit.textContent = "✏️ 名前を変更";
    edit.addEventListener("click", () => editMember(member.name));

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-button";
    del.textContent = "🗑️ 削除";
    del.addEventListener("click", () => deleteMember(member.name));

    controls.append(select, save, edit, del);

    item.append(info, controls);
    container.appendChild(item);
  });
}


/* 所属変更 */
async function updateMemberAffiliation(name, affiliation) {
  try {
    await apiPost({
      action: "updateMember",
      pin: adminPin,
      oldName: name,
      affiliation
    });

    await loadData();

    showAdminMessage(
      `${name} さんの所属を変更しました。`,
      "success"
    );

  } catch (error) {
    alert(error.message || "所属を変更できませんでした。");
  }
}


/* 名前変更 */
async function editMember(oldName) {
  const newName = prompt(
    "新しいメンバー名を入力してください。",
    oldName
  );

  if (newName === null) return;

  const name = newName.trim();

  if (!name) {
    alert("名前を入力してください。");
    return;
  }

  if (name === oldName) return;

  try {
    await apiPost({
      action: "updateMember",
      pin: adminPin,
      oldName,
      name
    });

    await loadData();

    showAdminMessage("メンバー名を変更しました。", "success");

  } catch (error) {
    alert(error.message || "メンバー名を変更できませんでした。");
  }
}


/* メンバー削除 */
async function deleteMember(name) {
  if (!confirm(
    `「${name}」をメンバー一覧から削除しますか？\n登録済みの回答も削除されます。`
  )) {
    return;
  }

  try {
    await apiPost({
      action: "deleteMember",
      pin: adminPin,
      name
    });

    await loadData();

    showAdminMessage("メンバーを削除しました。", "success");

  } catch (error) {
    alert(error.message || "メンバーを削除できませんでした。");
  }
}

/* ==================================================
   メッセージ表示
================================================== */

function showMessage(text, type) {
  const message = document.getElementById("message");
  if (!message) return;

  message.textContent = text;
  message.className = `message ${type}`;

  if (messageTimer) clearTimeout(messageTimer);

  messageTimer = setTimeout(() => {
    message.className = "message";
  }, 5000);
}

function showAdminMessage(text, type) {
  const message = document.getElementById("admin-message");
  if (!message) return;

  message.textContent = text;
  message.className = `admin-message ${type}`;
}

/* ==================================================
   共通関数
================================================== */

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
