import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

import "./App.css";
const env = import.meta.env;

const genAI = new GoogleGenerativeAI(env.VITE_GEMINI_API);
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
  responseSchema: {
    type: "array",
    items: {
      type: "object",
      properties: {
        topic: {
          type: "string",
        },
        question: {
          type: "string",
        },
        specification: {
          type: "string",
        },
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              answer: {
                type: "string",
              },
              is_correct: {
                type: "boolean",
              },
            },
            required: ["answer", "is_correct"],
          },
        },
      },
      required: ["question", "answers", "specification"],
    },
  },
};
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-lite",
  systemInstruction:
    "Create a quiz where the questions falls under the Bloom's Taxonomy Cognitive Domain. The structure of the quiz will be based on the specifications per topics given in the prompt. Ensure that all of the contents in the quiz are present in the document provided. For each questions, provide 4 multiple choices with only one correct answer. Include the specification according to the Bloom's Taxonomy Cognitive Domain, and the topic which the question came from.",
  generationConfig: generationConfig,
});

function App() {
  const [rows, setRows] = useState([
    {
      topic: "",
      hours: 0,
      percentage: 0,
      remembering: 0,
      understanding: 0,
      applying: 0,
      analyzing: 0,
      creating: 0,
      evaluating: 0,
      totalItems: 0,
    },
  ]);
  const [sourceMaterial, setSourceMaterial] = useState("");
  const [response, setResponse] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [total, setTotal] = useState({
    items: 0,
    hours: 0,
    percentage: 0,
    remembering: 0,
    understanding: 0,
    applying: 0,
    analyzing: 0,
    creating: 0,
    evaluating: 0,
    totalItems: 0,
  });

  // calculate total hours when rows change
  useEffect(() => {
    const totalHours = rows.reduce(
      (sum, row) => sum + parseInt(row.hours || 0),
      0
    );
    const totalPercent = rows.reduce(
      (sum, row) => sum + parseInt(row.percentage || 0),
      0
    );
    const totalRem = rows.reduce(
      (sum, row) => sum + parseInt(row.remembering || 0),
      0
    );
    const totalUnd = rows.reduce(
      (sum, row) => sum + parseInt(row.understanding || 0),
      0
    );
    const totalApp = rows.reduce(
      (sum, row) => sum + parseInt(row.applying || 0),
      0
    );
    const totalAna = rows.reduce(
      (sum, row) => sum + parseInt(row.analyzing || 0),
      0
    );
    const totalCre = rows.reduce(
      (sum, row) => sum + parseInt(row.creating || 0),
      0
    );
    const totalEva = rows.reduce(
      (sum, row) => sum + parseInt(row.evaluating || 0),
      0
    );
    const totalItems = rows.reduce(
      (sum, row) => sum + parseInt(row.totalItems || 0),
      0
    );

    setTotal({
      ...total,
      hours: totalHours,
      percentage: totalPercent,
      remembering: totalRem,
      understanding: totalUnd,
      applying: totalApp,
      analyzing: totalAna,
      creating: totalCre,
      evaluating: totalEva,
      totalItems: totalItems,
    });
  }, [rows]);

  // calculate total percent when total hours change
  useEffect(() => {
    if (total.hours === 0) return;

    const updatedRows = rows.map((row) => {
      // var percentage = (row.hours / total.hours) * 100;
      var percentage = Math.round((row.hours / total.hours) * 100);
      var itemsPerRow = Math.round((total.items * percentage) / 100);

      return {
        ...row,
        percentage: percentage.toFixed(2),
        remembering: Math.round(itemsPerRow * 0.1),
        understanding: Math.round(itemsPerRow * 0.2),
        applying: Math.round(itemsPerRow * 0.3),
        analyzing: Math.round(itemsPerRow * 0.15),
        creating: Math.round(itemsPerRow * 0.1),
        evaluating: Math.round(itemsPerRow * 0.15),

        totalItems: itemsPerRow,
      };
    });

    setRows(updatedRows);
  }, [total.hours, total.items]);

  const handleFileChange = (e) => {
    setSourceMaterial(e.target.files[0]);
  };

  const addRow = () => {
    const newRow = {
      topic: "",
      hours: 0,
      percentage: 0,
      remembering: 0,
      understanding: 0,
      applying: 0,
      analyzing: 0,
      creating: 0,
      evaluating: 0,
      totalItems: 0,
    };
    setRows([...rows, newRow]);
  };

  const changeTotalItems = (e) => {
    setTotal({ ...total, items: e.target.value });
  };

  const handleInputChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    //

    setRows(updatedRows);
  };

  const generateQuestion = async (e) => {
    e.preventDefault();
    setResponse("Generating...");
    setQuiz([]);
    console.log("Generating...");

    var reqs =
      "The total number of questions are " + total.items + ". The Topics are: ";
    rows.forEach((row, index) => {
      reqs +=
        "Topic no. " +
        (index + 1) +
        ". " +
        row.topic +
        " with " +
        row.remembering +
        " question on Remembering, " +
        row.understanding +
        " question on Understanding, " +
        row.applying +
        " question on Applying, " +
        row.analyzing +
        " question on Analyzing, " +
        row.creating +
        " question on Creating, and " +
        row.evaluating +
        " question on Evaluating. ";
    });

    const prompt = reqs;

    if (rows.length === 0) {
      setResponse("There must be atleast 1 topic");
      return;
    }

    if (total.hours <= 0) {
      setResponse("Hours cannot be equal or less than 0");
      return;
    }

    const file = sourceMaterial;
    const reader = new FileReader();

    reader.onload = async (e) => {
      const base64Data = e.target.result.split(",")[1];

      try {
        const result = await model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: "application/pdf",
            },
          },
          prompt,
        ]);
        // console.log(result.response.text());
        // console.log(JSON.parse(result.response.text()));
        // setResponse(result.response.text());
        // setResponse(Array.from(result.response.text()));
        setQuiz(JSON.parse(result.response.text()));

        // console.log(quiz);
        // setResponse(JSON.stringify(result.response.text()));
      } catch (error) {
        console.error(error);
        setResponse(
          "There seems to be a problem on our side. Please try again. "
        );
      }
    };

    reader.readAsDataURL(file);
    // console.log(prompt);
  };

  const removeRow = () => {
    rows.pop();
    setRows([...rows]);
  };
  return (
    <div className="gradient-background">
      <h1 className="title">Tosifier</h1>
      <form onSubmit={generateQuestion}>
        <div className="tosInput">
          <input
            required
            name="materialInput"
            className="materialInput"
            type="file"
            accept="application/pdf"
            placeholder="Add source material"
            onChange={handleFileChange}
          />

          <input
            required
            className="itemInput"
            type="number"
            placeholder="Total Items"
            onChange={changeTotalItems}
          />

          <div className="tosInputBtn">
            <button onClick={addRow}>Add Topic</button>

            <button onClick={removeRow} disabled={rows.length === 0}>
              Remove Topic
            </button>
          </div>
        </div>

        <table className="glassCard">
          <thead>
            <tr>
              <th rowSpan={2}>Topic</th>
              <th rowSpan={2}>Hours</th>
              <th rowSpan={2}>Percentage</th>
              <th colSpan={2}>EASY</th>
              <th colSpan={2}>MEDIUM</th>
              <th colSpan={2}>HARD</th>
              <th rowSpan={2}>Total Items</th>
            </tr>
            <tr>
              <th>Remembering (10%)</th>
              <th>Understanding (20%)</th>
              <th>Applying (30%)</th>
              <th>Analyzing (15%)</th>
              <th>Creating (10%)</th>
              <th>Evaluating (15%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <input
                    required
                    name="topicInput"
                    className="topicInput"
                    type="text"
                    placeholder="enter topic name"
                    onChange={(e) =>
                      handleInputChange(index, "topic", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    required
                    index={index}
                    type="number"
                    name="hoursInput"
                    min={0}
                    placeholder="enter hours"
                    onChange={(e) =>
                      handleInputChange(index, "hours", e.target.value)
                    }
                  />
                </td>
                <td>{row.percentage} %</td>
                <td>{row.remembering}</td>
                <td>{row.understanding}</td>
                <td>{row.applying}</td>
                <td>{row.analyzing}</td>
                <td>{row.creating}</td>
                <td>{row.evaluating}</td>
                <td>{row.totalItems}</td>
              </tr>
            ))}
            <tr>
              <td>Total</td>
              <td>{total.hours}</td>
              <td>{total.percentage} %</td>
              <td>{total.remembering}</td>
              <td>{total.understanding}</td>
              <td>{total.applying}</td>
              <td>{total.analyzing}</td>
              <td>{total.creating}</td>
              <td>{total.evaluating}</td>
              <td>{total.totalItems}</td>
            </tr>
          </tbody>
        </table>
        <div>
          <button type="submit">generate</button>
        </div>

        {quiz.length == 0 ? (
          <p className="response">{response}</p>
        ) : (
          quiz.map((e, index) => {
            return (
              <div key={index} className="questionItem">
                {/* question */}
                <h3>
                  <b> Question {index + 1}</b>
                </h3>
                <p> {e.question}</p>
                {/* choices */}
                <h3>
                  <b> Choices: </b>
                </h3>
                {e.answers.map((e, index) => {
                  return e.is_correct ? (
                    <p key={index}>
                      {" "}
                      - <u>{e.answer}</u>{" "}
                    </p>
                  ) : (
                    <p key={index}>- {e.answer}</p>
                  );
                })}
                {/* spec */}
                <h3>
                  <b> Specification: {e.specification}</b>
                </h3>
                {/* topic */}
                <h3>
                  <b> Topic: {e.topic}</b>
                </h3>
              </div>
            );
          })
          // <p className="response">"{quiz.length}"</p>
        )}
      </form>
    </div>
  );
}

export default App;
