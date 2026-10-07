/* ==================================================
   オープンキャンパス ボランティア参加確認
   script.js
================================================== */


/* ==================================================
   ① Apps Script URL
================================================== */

/*
  Google Apps ScriptをWebアプリとして公開したら、
  下のURLを自分のApps Script URLに変更してください。

  例：
  https://script.google.com/macros/s/XXXXXXXXXXXX/exec
*/

const API_URL =
  "ここにApps ScriptのWebアプリURLを入れる";


/* ==================================================
   ② オープンキャンパス日程
================================================== */

/*
  日程を追加・変更するときはここを編集します。

  id：
  スプレッドシート側で使用する識別番号

  label：
  画面に表示する日程
*/

const EVENT_DATES = [
  {
    id: "2026-05-13",
    label: "5月13日（水）"
  },
  {
    id: "2026-06-17",
    label: "6月17日（水）"
  },
  {
    id: "2026-07-22",
    label: "7月22日（水）"
  }
];


/* ==================================================
   ③ 現在選択されている回答
================================================== */

const answers = {};


/* ==================================================
   ④ 初期化
================================================== */

document.addEventListener("DOMContentLoaded", () => {

  createDateButtons();

  document
    .getElementById("submit-button")
    .addEventListener("click", submitAnswer);

  loadParticipants();

});


/* ==================================================
   ⑤ 日程ボタン生成
================================================== */

function createDateButtons() {

  const container =
    document.getElementById("date-list");

  container.innerHTML = "";

  EVENT_DATES.forEach(event => {

    answers[event.id] = "";

    const item =
      document.createElement("div");

    item.className = "date-item";

    item.innerHTML = `

      <div class="date-name">
        ${event.label}
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

  });


  /*
    ○ / × ボタンのクリック処理
  */

  document
    .querySelectorAll(".choice-button")
    .forEach(button => {

      button.addEventListener("click", () => {

        const date =
          button.dataset.date;

        const value =
          button.dataset.value;

        answers[date] = value;


        /*
          同じ日程のボタンをリセット
        */

        document
          .querySelectorAll(
            `.choice-button[data-date="${date}"]`
          )
          .forEach(btn => {

            btn.classList.remove(
              "selected-yes",
              "selected-no"
            );

          });


        /*
          選択したボタンを強調
        */

        if (value === "○") {

          button.classList.add(
            "selected-yes"
          );

        } else {

          button.classList.add(
            "selected-no"
          );

        }

      });

    });

}


/* ==================================================
   ⑥ 登録
================================================== */

async function submitAnswer() {

  const name =
    document
      .getElementById("name")
      .value
      .trim();


  /*
    名前チェック
  */

  if (!name) {

    showMessage(
      "名前を入力してください。",
      "error"
    );

    return;

  }


  /*
    全日程回答チェック
  */

  const unanswered =
    EVENT_DATES.filter(
      event => !answers[event.id]
    );


  if (unanswered.length > 0) {

    showMessage(
      "すべての日程について「○」または「×」を選択してください。",
      "error"
    );

    return;

  }


  const button =
    document.getElementById(
      "submit-button"
    );


  button.disabled = true;

  button.querySelector("span:first-child")
    .textContent = "登録中…";


  try {

    const data = {

      action: "save",

      name: name,

      answers: answers

    };


    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify(data)

      });


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message ||
        "登録に失敗しました。"
      );

    }


    showMessage(
      "参加状況を登録しました！",
      "success"
    );


    /*
      最新データを再取得
    */

    await loadParticipants();


  } catch (error) {

    console.error(error);

    showMessage(
      "登録に失敗しました。Apps Scriptの設定を確認してください。",
      "error"
    );

  }


  button.disabled = false;

  button.querySelector("span:first-child")
    .textContent = "登録する";

}


/* ==================================================
   ⑦ 参加者データ取得
================================================== */

async function loadParticipants() {

  /*
    Apps Script URLが未設定の場合
  */

  if (
    !API_URL ||
    API_URL.includes("ここにApps Script")
  ) {

    displayEmptyTable(
      "Apps Scriptを設定すると参加状況が表示されます。"
    );

    return;

  }


  try {

    const response =
      await fetch(
        `${API_URL}?action=get`
      );


    const result =
      await response.json();


    if (!result.success) {

      throw new Error(
        result.message ||
        "データ取得失敗"
      );

    }


    renderParticipants(
      result.data || []
    );


  } catch (error) {

    console.error(error);

    displayEmptyTable(
      "参加状況を取得できませんでした。"
    );

  }

}


/* ==================================================
   ⑧ 参加者一覧表示
================================================== */

function renderParticipants(data) {

  const header =
    document.getElementById(
      "table-header"
    );

  const body =
    document.getElementById(
      "table-body"
    );


  /*
    ヘッダー
  */

  header.innerHTML = "";

  const nameHeader =
    document.createElement("th");

  nameHeader.textContent =
    "名前";

  header.appendChild(nameHeader);


  EVENT_DATES.forEach(event => {

    const th =
      document.createElement("th");

    th.textContent =
      event.label;

    header.appendChild(th);

  });


  /*
    データなし
  */

  if (!data.length) {

    body.innerHTML = `

      <tr>

        <td
          colspan="${EVENT_DATES.length + 1}"
          class="empty-cell"
        >
          まだ登録されていません
        </td>

      </tr>

    `;

    renderSummary([]);

    return;

  }


  /*
    表を生成
  */

  body.innerHTML = "";


  data.forEach(person => {

    const tr =
      document.createElement("tr");


    /*
      名前
    */

    const nameTd =
      document.createElement("td");

    nameTd.className =
      "name-cell";

    nameTd.textContent =
      person.name || "";

    tr.appendChild(nameTd);


    /*
      各日程
    */

    EVENT_DATES.forEach(event => {

      const td =
        document.createElement("td");

      const value =
        person.answers?.[event.id] || "";


      if (value === "○") {

        td.textContent = "○";

        td.className =
          "answer-yes";

      } else if (value === "×") {

        td.textContent = "×";

        td.className =
          "answer-no";

      } else {

        td.textContent = "－";

        td.className =
          "answer-empty";

      }


      tr.appendChild(td);

    });


    body.appendChild(tr);

  });


  renderSummary(data);

}


/* ==================================================
   ⑨ 日程別人数
================================================== */

function renderSummary(data) {

  const container =
    document.getElementById(
      "summary-list"
    );


  container.innerHTML = "";


  EVENT_DATES.forEach(event => {

    const count =
      data.filter(person => {

        return (
          person.answers &&
          person.answers[event.id] === "○"
        );

      }).length;


    const card =
      document.createElement("div");

    card.className =
      "summary-card";


    card.innerHTML = `

      <div class="summary-date">
        ${event.label}
      </div>

      <div class="summary-count">
        ${count}
        <span>人が参加可能</span>
      </div>

    `;


    container.appendChild(card);

  });

}


/* ==================================================
   ⑩ データ取得失敗・未設定
================================================== */

function displayEmptyTable(message) {

  const header =
    document.getElementById(
      "table-header"
    );

  const body =
    document.getElementById(
      "table-body"
    );


  /*
    ヘッダー
  */

  header.innerHTML = "";

  const th =
    document.createElement("th");

  th.textContent = "名前";

  header.appendChild(th);


  EVENT_DATES.forEach(event => {

    const dateTh =
      document.createElement("th");

    dateTh.textContent =
      event.label;

    header.appendChild(dateTh);

  });


  /*
    本文
  */

  body.innerHTML = `

    <tr>

      <td
        colspan="${EVENT_DATES.length + 1}"
        style="
          text-align:center;
          padding:30px;
          color:#7b8799;
        "
      >
        ${message}
      </td>

    </tr>

  `;


  /*
    サマリーもリセット
  */

  const summary =
    document.getElementById(
      "summary-list"
    );

  summary.innerHTML = "";

}


/* ==================================================
   ⑪ メッセージ表示
================================================== */

function showMessage(
  text,
  type
) {

  const message =
    document.getElementById(
      "message"
    );


  message.textContent =
    text;

  message.className =
    `message ${type}`;


  /*
    数秒後に消す
  */

  setTimeout(() => {

    message.className =
      "message";

  }, 5000);

}
