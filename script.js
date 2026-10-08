/* ==================================================
   オープンキャンパス
   ボランティア参加確認システム
================================================== */


/* ==================================================
   設定
================================================== */

const API_URL =
  "https://script.google.com/macros/s/AKfycbxQ3y-i2Y3WMtXM58xrrWoIjPQ7t0gNudo_YO6hRMg9zF2AyoqrTnZ7Yj_T35nbAJ6zRA/exec";


/* ==================================================
   データ
================================================== */

let eventDates = [];

let members = [];

let answers = {};

let adminPin = "";

// 各回の参加状況表示用
let participants = [];


/* ==================================================
   初期化
================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    setupEvents();

    loadData();

  }
);


/* ==================================================
   イベント設定
================================================== */

function setupEvents() {

  document
    .getElementById("submit-button")
    .addEventListener(
      "click",
      submitAnswer
    );


  document
    .getElementById("admin-open-button")
    .addEventListener(
      "click",
      openAdminPanel
    );


  document
    .getElementById("admin-close-button")
    .addEventListener(
      "click",
      closeAdminPanel
    );


  document
    .getElementById("admin-login-button")
    .addEventListener(
      "click",
      loginAdmin
    );


  document
    .getElementById("add-date-button")
    .addEventListener(
      "click",
      () => openDateModal()
    );


  /* =========================
     メンバー管理
  ========================= */

  const addMemberButton =
    document.getElementById(
      "add-member-button"
    );

  if (addMemberButton) {

    addMemberButton.addEventListener(
      "click",
      addMember
    );

  }


  /* =========================
     各回の参加状況
  ========================= */

  const attendanceDateSelect =
    document.getElementById(
      "attendance-date-select"
    );

  if (attendanceDateSelect) {

    attendanceDateSelect.addEventListener(
      "change",
      updateAttendanceView
    );

  }


  document
    .getElementById("modal-close-button")
    .addEventListener(
      "click",
      closeDateModal
    );


  document
    .getElementById("modal-cancel-button")
    .addEventListener(
      "click",
      closeDateModal
    );


  document
    .getElementById("modal-save-button")
    .addEventListener(
      "click",
      saveDate
    );

}


/* ==================================================
   データ取得
================================================== */

async function loadData() {

  if (
    !API_URL ||
    API_URL.includes(
      "ここにApps Script"
    )
  ) {

    showMessage(
      "script.jsにApps ScriptのURLを設定してください。",
      "error"
    );

    return;

  }


  try {

    const response =
      await fetch(
        `${API_URL}?action=getAll`
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    eventDates =
      result.dates || [];


    members =
      result.members || [];


    participants =
      result.participants || [];


    renderMemberSelect();

    renderDateList();


    renderParticipants(
      participants
    );


    /* =========================
       各回の参加状況
    ========================= */

    loadAttendanceDates();


  } catch (error) {

    console.error(error);

    showMessage(
      "データを取得できませんでした。",
      "error"
    );

  }

}


/* ==================================================
   メンバー選択
================================================== */

function renderMemberSelect() {

  const select =
    document.getElementById(
      "name"
    );


  if (!select) {
    return;
  }


  select.innerHTML = `

    <option value="">
      名前を選択してください
    </option>

  `;


  if (!members.length) {

    select.innerHTML = `

      <option value="">
        登録されているメンバーがありません
      </option>

    `;

    select.disabled = true;

    return;

  }


  select.disabled = false;


  members.forEach(
    member => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        member;


      option.textContent =
        member;


      select.appendChild(
        option
      );

    }
  );

}


/* ==================================================
   日程表示
================================================== */

function renderDateList() {

  const container =
    document.getElementById(
      "date-list"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!eventDates.length) {

    container.innerHTML = `

      <div class="loading">

        現在、登録されている
        オーキャン日程はありません。

      </div>

    `;

    return;

  }


  eventDates.forEach(
    event => {

      if (
        answers[event.id] === undefined
      ) {

        answers[event.id] = "";

      }


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "date-item";


      item.innerHTML = `

        <div class="date-name">

          ${escapeHtml(event.title)}

          <br>

          <small>
            ${escapeHtml(
              formatDate(event.date)
            )}
          </small>

        </div>


        <div class="date-options">

          <button
            type="button"
            class="choice-button"
            data-date="${event.id}"
            data-value="○"
          >
            ○ 参加できる
          </button>


          <button
            type="button"
            class="choice-button"
            data-date="${event.id}"
            data-value="×"
          >
            × 参加できない
          </button>

        </div>

      `;


      container.appendChild(item);

    }
  );


  document
    .querySelectorAll(
      ".choice-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const date =
              button.dataset.date;


            const value =
              button.dataset.value;


            answers[date] =
              value;


            document
              .querySelectorAll(
                `.choice-button[data-date="${date}"]`
              )
              .forEach(
                btn => {

                  btn.classList.remove(
                    "selected-yes",
                    "selected-no"
                  );

                }
              );


            if (
              value === "○"
            ) {

              button.classList.add(
                "selected-yes"
              );

            } else {

              button.classList.add(
                "selected-no"
              );

            }

          }
        );

      }
    );

}


/* ==================================================
   参加登録
================================================== */

async function submitAnswer() {

  const name =
    document
      .getElementById("name")
      .value;


  if (!name) {

    showMessage(
      "名前を選択してください。",
      "error"
    );

    return;

  }


  if (!eventDates.length) {

    showMessage(
      "登録できる日程がありません。",
      "error"
    );

    return;

  }


  const unanswered =
    eventDates.filter(
      event =>
        !answers[event.id]
    );


  if (unanswered.length) {

    showMessage(
      "すべての日程について○または×を選択してください。",
      "error"
    );

    return;

  }


  const button =
    document.getElementById(
      "submit-button"
    );


  button.disabled = true;


  const buttonText =
    button.querySelector(
      "span:first-child"
    );

  if (buttonText) {

    buttonText.textContent =
      "登録中…";

  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "saveParticipation",

              name:
                name,

              answers:
                answers

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    showMessage(
      "参加状況を登録しました！",
      "success"
    );


    await loadData();


  } catch (error) {

    console.error(error);

    showMessage(
      error.message ||
      "登録に失敗しました。",
      "error"
    );

  }


  button.disabled = false;


  if (buttonText) {

    buttonText.textContent =
      "登録する";

  }

}


/* ==================================================
   参加者一覧
================================================== */

function renderParticipants(
  data
) {

  const header =
    document.getElementById(
      "table-header"
    );


  const body =
    document.getElementById(
      "table-body"
    );


  if (!header || !body) {
    return;
  }


  header.innerHTML = `
    <th>名前</th>
  `;


  eventDates.forEach(
    event => {

      const th =
        document.createElement(
          "th"
        );


      th.innerHTML = `

        ${escapeHtml(
          event.title
        )}

        <br>

        <small>
          ${escapeHtml(
            formatDate(event.date)
          )}
        </small>

      `;


      header.appendChild(th);

    }
  );


  body.innerHTML = "";


  if (!data.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="${eventDates.length + 1}"
          style="
            text-align:center;
            padding:30px;
            color:#7b8799;
          "
        >
          まだ登録されていません。
        </td>

      </tr>

    `;


    renderSummary([]);


    return;

  }


  data.forEach(
    person => {

      const tr =
        document.createElement(
          "tr"
        );


      const name =
        document.createElement(
          "td"
        );


      name.className =
        "name-cell";


      name.textContent =
        person.name;


      tr.appendChild(name);


      eventDates.forEach(
        event => {

          const td =
            document.createElement(
              "td"
            );


          const value =
            person.answers &&
            person.answers[event.id]
              ? person.answers[event.id]
              : "";


          if (
            value === "○"
          ) {

            td.textContent = "○";

            td.className =
              "answer-yes";

          } else if (
            value === "×"
          ) {

            td.textContent = "×";

            td.className =
              "answer-no";

          } else {

            td.textContent = "－";

            td.className =
              "answer-empty";

          }


          tr.appendChild(td);

        }
      );


      body.appendChild(tr);

    }
  );


  renderSummary(data);

}


/* ==================================================
   日程ごとの参加人数
================================================== */

function renderSummary(
  data
) {

  const container =
    document.getElementById(
      "summary-list"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  eventDates.forEach(
    event => {

      const count =
        data.filter(
          person =>
            person.answers &&
            person.answers[event.id] === "○"
        ).length;


      const card =
        document.createElement(
          "div"
        );


      card.className =
        "summary-card";


      card.innerHTML = `

        <div class="summary-date">

          ${escapeHtml(
            event.title
          )}

          <br>

          ${escapeHtml(
            formatDate(event.date)
          )}

        </div>


        <div class="summary-count">

          ${count}

          <span>
            人が参加可能
          </span>

        </div>

      `;


      container.appendChild(card);

    }
  );

}


/* ==================================================
   各回の参加状況
================================================== */

/*
   日程選択欄を作成
*/

function loadAttendanceDates() {

  const select =
    document.getElementById(
      "attendance-date-select"
    );


  if (!select) {
    return;
  }


  const currentValue =
    select.value;


  select.innerHTML = `

    <option value="">
      回を選択してください
    </option>

  `;


  eventDates.forEach(
    event => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        event.id;


      option.textContent =
        `${formatDate(event.date)}｜${event.title}`;


      select.appendChild(
        option
      );

    }
  );


  /*
     データ更新後も
     選択していた回を維持
  */

  if (
    currentValue &&
    eventDates.some(
      event =>
        event.id === currentValue
    )
  ) {

    select.value =
      currentValue;

    updateAttendanceView();

  }

}


/*
   選択された回の参加状況を表示
*/

function updateAttendanceView() {

  const select =
    document.getElementById(
      "attendance-date-select"
    );


  if (!select) {
    return;
  }


  const dateId =
    select.value;


  if (!dateId) {

    resetAttendanceView();

    return;

  }


  const yesMembers = [];

  const noMembers = [];

  const unansweredMembers = [];


  /*
     登録メンバー全員を確認
  */

  members.forEach(
    member => {

      const participant =
        participants.find(
          person =>
            person.name === member
        );


      let answer = "";


      if (
        participant &&
        participant.answers
      ) {

        answer =
          participant.answers[dateId] || "";

      }


      if (
        answer === "○"
      ) {

        yesMembers.push(member);

      } else if (
        answer === "×"
      ) {

        noMembers.push(member);

      } else {

        unansweredMembers.push(member);

      }

    }
  );


  /*
     人数表示
  */

  const yesCount =
    document.getElementById(
      "attendance-yes-count"
    );

  const noCount =
    document.getElementById(
      "attendance-no-count"
    );

  const unansweredCount =
    document.getElementById(
      "attendance-unanswered-count"
    );


  if (yesCount) {

    yesCount.textContent =
      yesMembers.length;

  }


  if (noCount) {

    noCount.textContent =
      noMembers.length;

  }


  if (unansweredCount) {

    unansweredCount.textContent =
      unansweredMembers.length;

  }


  /*
     メンバー一覧
  */

  renderAttendanceMembers(
    "attendance-yes-list",
    yesMembers,
    "参加可能なメンバーはいません。"
  );


  renderAttendanceMembers(
    "attendance-no-list",
    noMembers,
    "参加不可のメンバーはいません。"
  );


  renderAttendanceMembers(
    "attendance-unanswered-list",
    unansweredMembers,
    "未回答のメンバーはいません。"
  );

}


/*
   各カテゴリーのメンバー表示
*/

function renderAttendanceMembers(
  elementId,
  memberList,
  emptyMessage
) {

  const container =
    document.getElementById(
      elementId
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!memberList.length) {

    container.innerHTML = `

      <p class="attendance-empty">
        ${escapeHtml(emptyMessage)}
      </p>

    `;

    return;

  }


  memberList.forEach(
    member => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "attendance-member";


      item.textContent =
        member;


      container.appendChild(
        item
      );

    }
  );

}


/*
   各回の参加状況をリセット
*/

function resetAttendanceView() {

  const yesCount =
    document.getElementById(
      "attendance-yes-count"
    );

  const noCount =
    document.getElementById(
      "attendance-no-count"
    );

  const unansweredCount =
    document.getElementById(
      "attendance-unanswered-count"
    );


  if (yesCount) {

    yesCount.textContent =
      "0";

  }


  if (noCount) {

    noCount.textContent =
      "0";

  }


  if (unansweredCount) {

    unansweredCount.textContent =
      "0";

  }


  const message = `

    <p class="attendance-empty">
      回を選択してください。
    </p>

  `;


  const yesList =
    document.getElementById(
      "attendance-yes-list"
    );

  const noList =
    document.getElementById(
      "attendance-no-list"
    );

  const unansweredList =
    document.getElementById(
      "attendance-unanswered-list"
    );


  if (yesList) {

    yesList.innerHTML =
      message;

  }


  if (noList) {

    noList.innerHTML =
      message;

  }


  if (unansweredList) {

    unansweredList.innerHTML =
      message;

  }

}


/* ==================================================
   管理者パネル
================================================== */

function openAdminPanel() {

  const panel =
    document.getElementById(
      "admin-panel"
    );


  if (!panel) {
    return;
  }


  panel.classList.add(
    "active"
  );


  panel.scrollIntoView({
    behavior: "smooth"
  });

}


function closeAdminPanel() {

  const panel =
    document.getElementById(
      "admin-panel"
    );


  if (!panel) {
    return;
  }


  panel.classList.remove(
    "active"
  );

}


/* ==================================================
   管理者ログイン
================================================== */

async function loginAdmin() {

  const pin =
    document
      .getElementById(
        "admin-pin"
      )
      .value
      .trim();


  if (!pin) {

    showAdminMessage(
      "PINを入力してください。",
      "error"
    );

    return;

  }


  try {

    const response =
      await fetch(
        `${API_URL}?action=adminLogin&pin=${encodeURIComponent(pin)}`
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    adminPin =
      pin;


    document
      .getElementById(
        "admin-login"
      )
      .style.display =
        "none";


    document
      .getElementById(
        "admin-content"
      )
      .classList.remove(
        "hidden"
      );


    loadAdminDates();

    loadAdminMembers();


  } catch (error) {

    showAdminMessage(
      error.message ||
      "ログインできませんでした。",
      "error"
    );

  }

}


/* ==================================================
   管理者：日程一覧
================================================== */

function loadAdminDates() {

  const container =
    document.getElementById(
      "admin-date-list"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!eventDates.length) {

    container.innerHTML = `

      <div class="loading">
        登録されている日程はありません。
      </div>

    `;

    return;

  }


  eventDates.forEach(
    event => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "admin-date-item";


      item.innerHTML = `

        <div class="admin-date-info">

          <strong>
            ${escapeHtml(
              event.title
            )}
          </strong>

          <span>
            ${escapeHtml(
              formatDate(event.date)
            )}
          </span>

        </div>


        <div class="admin-date-actions">

          <button
            class="edit-button"
            data-id="${event.id}"
          >
            ✏️ 編集
          </button>


          <button
            class="delete-button"
            data-id="${event.id}"
          >
            🗑️ 削除
          </button>

        </div>

      `;


      container.appendChild(item);

    }
  );


  document
    .querySelectorAll(
      ".edit-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            const event =
              eventDates.find(
                item =>
                  item.id ===
                  button.dataset.id
              );


            if (event) {

              openDateModal(
                event
              );

            }

          }
        );

      }
    );


  document
    .querySelectorAll(
      ".delete-button"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () =>
            deleteDate(
              button.dataset.id
            )
        );

      }
    );

}


/* ==================================================
   日程モーダル
================================================== */

function openDateModal(
  event = null
) {

  const modal =
    document.getElementById(
      "date-modal"
    );


  const title =
    document.getElementById(
      "modal-title"
    );


  const id =
    document.getElementById(
      "edit-date-id"
    );


  const date =
    document.getElementById(
      "event-date"
    );


  const eventTitle =
    document.getElementById(
      "event-title"
    );


  if (event) {

    title.textContent =
      "日程を編集";

    id.value =
      event.id;

    date.value =
      event.date;

    eventTitle.value =
      event.title;

  } else {

    title.textContent =
      "日程を追加";

    id.value = "";

    date.value = "";

    eventTitle.value = "";

  }


  modal.classList.add(
    "active"
  );

}


function closeDateModal() {

  document
    .getElementById(
      "date-modal"
    )
    .classList.remove(
      "active"
    );

}


/* ==================================================
   日程保存
================================================== */

async function saveDate() {

  const id =
    document
      .getElementById(
        "edit-date-id"
      )
      .value;


  const date =
    document
      .getElementById(
        "event-date"
      )
      .value;


  const title =
    document
      .getElementById(
        "event-title"
      )
      .value
      .trim();


  if (!date) {

    alert(
      "日付を入力してください。"
    );

    return;

  }


  if (!title) {

    alert(
      "表示名を入力してください。"
    );

    return;

  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                id
                  ? "updateDate"
                  : "addDate",

              pin:
                adminPin,

              id:
                id,

              date:
                date,

              title:
                title

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    closeDateModal();


    await loadData();


    loadAdminDates();


  } catch (error) {

    alert(
      error.message ||
      "保存に失敗しました。"
    );

  }

}


/* ==================================================
   日程削除
================================================== */

async function deleteDate(
  id
) {

  const event =
    eventDates.find(
      item =>
        item.id === id
    );


  if (!event) {
    return;
  }


  const confirmed =
    confirm(
      `「${event.title}」を削除しますか？\n\nこの日程の参加回答も削除されます。`
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "deleteDate",

              pin:
                adminPin,

              id:
                id

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    await loadData();


    loadAdminDates();


  } catch (error) {

    alert(
      error.message ||
      "削除に失敗しました。"
    );

  }

}


/* ==================================================
   管理者：メンバー一覧
================================================== */

function loadAdminMembers() {

  const container =
    document.getElementById(
      "admin-member-list"
    );


  if (!container) {
    return;
  }


  container.innerHTML = "";


  if (!members.length) {

    container.innerHTML = `

      <div class="admin-member-empty">
        登録されているメンバーはいません。
      </div>

    `;

    return;

  }


  members.forEach(
    member => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "admin-member-item";


      item.innerHTML = `

        <div class="admin-member-name">
          ${escapeHtml(member)}
        </div>

        <div class="admin-member-actions">

          <button
            type="button"
            class="admin-member-edit"
          >
            編集
          </button>

          <button
            type="button"
            class="admin-member-delete"
          >
            削除
          </button>

        </div>

      `;


      /* 編集 */

      item
        .querySelector(
          ".admin-member-edit"
        )
        .addEventListener(
          "click",
          () =>
            editMember(member)
        );


      /* 削除 */

      item
        .querySelector(
          ".admin-member-delete"
        )
        .addEventListener(
          "click",
          () =>
            deleteMember(member)
        );


      container.appendChild(item);

    }
  );

}


/* ==================================================
   メンバー追加
================================================== */

async function addMember() {

  const input =
    document.getElementById(
      "new-member-name"
    );


  if (!input) {
    return;
  }


  const name =
    input.value.trim();


  if (!name) {

    alert(
      "メンバー名を入力してください。"
    );

    return;

  }


  if (members.includes(name)) {

    alert(
      "この名前はすでに登録されています。"
    );

    return;

  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "addMember",

              pin:
                adminPin,

              name:
                name

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    input.value = "";


    await loadData();


    loadAdminMembers();


    alert(
      "メンバーを追加しました！"
    );


  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "メンバーの追加に失敗しました。"
    );

  }

}


/* ==================================================
   メンバー編集
================================================== */

async function editMember(
  oldName
) {

  const newName =
    prompt(
      "新しい名前を入力してください。",
      oldName
    );


  if (
    newName === null
  ) {

    return;

  }


  const name =
    newName.trim();


  if (!name) {

    alert(
      "名前を入力してください。"
    );

    return;

  }


  if (
    name !== oldName &&
    members.includes(name)
  ) {

    alert(
      "この名前はすでに登録されています。"
    );

    return;

  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "updateMember",

              pin:
                adminPin,

              oldName:
                oldName,

              newName:
                name

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    await loadData();


    loadAdminMembers();


    alert(
      "メンバー名を変更しました！"
    );


  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "メンバーの変更に失敗しました。"
    );

  }

}


/* ==================================================
   メンバー削除
================================================== */

async function deleteMember(
  name
) {

  const confirmed =
    confirm(
      `「${name}」をメンバー一覧から削除しますか？\n\n参加状況のデータはそのまま残ります。`
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await fetch(
        API_URL,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "text/plain;charset=utf-8"
          },

          body:
            JSON.stringify({

              action:
                "deleteMember",

              pin:
                adminPin,

              name:
                name

            })

        }
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message
      );

    }


    await loadData();


    loadAdminMembers();


    alert(
      "メンバーを削除しました！"
    );


  } catch (error) {

    console.error(error);

    alert(
      error.message ||
      "メンバーの削除に失敗しました。"
    );

  }

}


/* ==================================================
   メッセージ
================================================== */

function showMessage(
  text,
  type
) {

  const message =
    document.getElementById(
      "message"
    );


  if (!message) {
    return;
  }


  message.textContent =
    text;


  message.className =
    `message ${type}`;


  setTimeout(
    () => {

      message.className =
        "message";

    },
    5000
  );

}


function showAdminMessage(
  text,
  type
) {

  const message =
    document.getElementById(
      "admin-message"
    );


  if (!message) {
    return;
  }


  message.textContent =
    text;


  message.className =
    `admin-message ${type}`;

}


/* ==================================================
   日付表示
================================================== */

function formatDate(
  dateString
) {

  if (!dateString) {
    return "";
  }


  const date =
    new Date(
      `${dateString}T00:00:00`
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return dateString;

  }


  const weekdays = [
    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"
  ];


  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}（${weekdays[date.getDay()]}）`;

}


/* ==================================================
   HTMLエスケープ
================================================== */

function escapeHtml(
  value
) {

  return String(
    value || ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}
