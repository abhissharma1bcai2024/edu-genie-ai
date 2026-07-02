// Edu Genie AI v2 - Part 1
function showScreen(screen){

    const screens=[
        "chatScreen",
        "pdfScreen",
        "quizScreen",
        "plannerScreen"
    ];

    screens.forEach(id=>{

        const page=document.getElementById(id);

        if(page){

            page.style.display="none";

        }

    });

    document.getElementById(screen+"Screen").style.display="block";

}

// ---------- Ask AI ----------

async function askAI(){

    const question=document.getElementById("question").value.trim();

    if(question===""){

        alert("Please enter a question.");

        return;

    }

    const chat=document.getElementById("chatContainer");

    chat.innerHTML+=`

    <div class="user-message">

        <div class="message">

            ${question}

        </div>

        <div class="user-avatar">

            👤

        </div>

    </div>

    `;

    chat.innerHTML+=`

    <div class="ai-message" id="loadingMessage">

        <div class="ai-avatar">

            🤖

        </div>

        <div class="message">

            ⏳ Thinking...

        </div>

    </div>

    `;

    chat.scrollTop=chat.scrollHeight;

    document.getElementById("question").value="";

    try{

        const response=await fetch("/ask",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                question:question

            })

        });

        const data=await response.json();

        document.getElementById("loadingMessage").remove();

        chat.innerHTML+=`

        <div class="ai-message">

            <div class="ai-avatar">

                🤖

            </div>

            <div class="message">

                ${data.answer}

            </div>

        </div>

        `;

        chat.scrollTop=chat.scrollHeight;

       await loadHistory();
    }

    catch(error){

        const loading=document.getElementById("loadingMessage");

        if(loading){

            loading.remove();

        }

        chat.innerHTML+=`

        <div class="ai-message">

            <div class="ai-avatar">

                ❌

            </div>

            <div class="message">

                ${error}

            </div>

        </div>

        `;

    }

}

// ---------- Enter Key ----------

document.addEventListener("DOMContentLoaded",()=>{

    const input=document.getElementById("question");

    if(input){

        input.addEventListener("keydown",(e)=>{

            if(e.key==="Enter" && !e.shiftKey){

                e.preventDefault();

                askAI();

            }

        });

    }

});
// =======================================
// History
// =======================================

// =======================================
// History
// =======================================

async function loadHistory() {

    console.log("loadHistory called");

    const historyList = document.getElementById("historyList");

    if (!historyList) {
        console.log("historyList not found");
        return;
    }

    try {

        const response = await fetch("/history");

        const chats = await response.json();

        console.log("History:", chats);

        historyList.innerHTML = "";

        chats.forEach(chat => {

            const div = document.createElement("div");

            div.className = "history-item";

            div.innerHTML = `<strong>💬 ${chat.question}</strong>`;

            div.onclick = function () {

                showChat(chat.question, chat.answer);

            };

            historyList.appendChild(div);

        });

        console.log("Items Added:", historyList.children.length);

    }

    catch (err) {

        console.error(err);

    }

}

// =======================================
// Show Previous Chat
// =======================================

function showChat(question, answer) {

    showScreen("chat");

    document.getElementById("question").value = question;

    const chat = document.getElementById("chatContainer");

    chat.innerHTML = `

    <div class="user-message">

        <div class="message">

            ${question}

        </div>

        <div class="user-avatar">

            👤

        </div>

    </div>

    <div class="ai-message">

        <div class="ai-avatar">

            🤖

        </div>

        <div class="message">

            ${answer.replace(/\n/g, "<br>")}

        </div>

    </div>

    `;

}

// =======================================
// Delete History
// =======================================

async function deleteHistory(){

    if(!confirm("Delete all history?")) return;

    const response=await fetch("/delete_history",{

        method:"POST"

    });

    const data=await response.json();

    alert(data.message);

    document.getElementById("historyList").innerHTML="";

    document.getElementById("chatContainer").innerHTML="";

}

// =======================================
// Search History
// =======================================

const search=document.getElementById("searchHistory");

if(search){

search.addEventListener("keyup",function(){

    let value=this.value.toLowerCase();

    document.querySelectorAll(".history-item").forEach(item=>{

        item.style.display=item.innerText.toLowerCase().includes(value)
        ?"block":"none";

    });

});

}

// =======================================
// Voice
// =======================================

function startVoice(){

    if(!("webkitSpeechRecognition" in window)){

        alert("Voice Recognition Not Supported");

        return;

    }

    const recognition=new webkitSpeechRecognition();

    recognition.lang="en-US";

    recognition.start();

    recognition.onresult=function(event){

        document.getElementById("question").value=
        event.results[0][0].transcript;

        askAI();

    };

}

// =======================================
// Load History on Start
// =======================================

window.onload=function(){

    loadHistory();

};
// =======================================
// PDF Upload
// =======================================

async function uploadPDF(){

    const file=document.getElementById("pdfFile").files[0];

    if(!file){

        alert("Select a PDF File");

        return;

    }

    const formData=new FormData();

    formData.append("pdf",file);

    document.getElementById("summary").innerHTML="⏳ Summarizing...";

    try{

        const response=await fetch("/upload_pdf",{

            method:"POST",

            body:formData

        });

        const data=await response.json();

        document.getElementById("summary").innerHTML=data.summary;

    }

    catch(error){

        document.getElementById("summary").innerHTML="❌ "+error;

    }

}

// =======================================
// Quiz Generator
// =======================================

async function generateQuiz(){

    const topic=document.getElementById("topic").value.trim();

    if(topic===""){

        alert("Enter Topic");

        return;

    }

    document.getElementById("quizResult").innerHTML="⏳ Generating Quiz...";

    try{

        const response=await fetch("/generate_quiz",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                topic:topic

            })

        });

        const data=await response.json();

        document.getElementById("quizResult").innerHTML=data.quiz;

    }

    catch(error){

        document.getElementById("quizResult").innerHTML="❌ "+error;

    }

}

// =======================================
// Study Planner
// =======================================

async function generatePlan(){

    const subject=document.getElementById("subject").value.trim();

    const days=document.getElementById("days").value.trim();

    if(subject==="" || days===""){

        alert("Enter Subject and Days");

        return;

    }

    document.getElementById("studyPlan").innerHTML="⏳ Creating Plan...";

    try{

        const response=await fetch("/study_plan",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                subject:subject,

                days:days

            })

        });

        const data=await response.json();

        document.getElementById("studyPlan").innerHTML=data.plan;

    }

    catch(error){

        document.getElementById("studyPlan").innerHTML="❌ "+error;

    }

}

// =======================================
// Download PDF
// =======================================

async function downloadPDF(){

    const chat=document.getElementById("chatContainer");

    const answer=chat.innerText;

    if(answer.trim()===""){

        alert("No Answer Available");

        return;

    }

    const response=await fetch("/download_pdf",{

        method:"POST",

        headers:{

            "Content-Type":"application/json"

        },

        body:JSON.stringify({

            answer:answer

        })

    });

    const blob=await response.blob();

    const url=window.URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="EduGenie_Answer.pdf";

    a.click();

    window.URL.revokeObjectURL(url);

}

// =======================================
// New Chat
// =======================================

function newChat(){

    document.getElementById("question").value="";

    document.getElementById("chatContainer").innerHTML=`

    <div class="ai-message">

        <div class="ai-avatar">

            🤖

        </div>

        <div class="message">

            <h3>Edu Genie AI</h3>

            👋 New Chat Started

            <br><br>

            Ask me anything.

        </div>

    </div>

    `;

}

// =======================================
// Active Menu Highlight
// =======================================

document.querySelectorAll(".menu-btn").forEach(btn=>{

    btn.addEventListener("click",function(){

        document.querySelectorAll(".menu-btn").forEach(b=>{

            b.classList.remove("active");

        });

        this.classList.add("active");

    });

});