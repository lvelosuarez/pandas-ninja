import * as React from "react"
import {
  ChakraProvider,
  Button,
  Container,
  Skeleton,
  useBoolean,
  useDisclosure,
  Box,
  ModalOverlay,
} from "@chakra-ui/react"

import theme from "./theme"
import { NavBar } from "./NavBar";
import { ChallengesDrawer } from "./ChallengesDrawer";

import { Allotment } from "allotment";
import { EditorBox } from "./EditorBox";
import { LogBox } from "./LogBox";
import { DataFrame } from "./DataFrame";
import { Octokit } from "octokit"

import { TextFrame } from "./TextFrame";


import "allotment/dist/style.css";

import {ChallengeFile, Challenge} from "./interfaces"
import { ViewFrame } from "./ViewFrame";
import {WinDialog} from "./WinDialog"

declare const window: any;
let global_stdout:string = "";
let current_input: [] = []
let current_expected: [] = []


export function App()
{
  
  // function load challenges
  async function load_challenges() {
    
    const octokit = new Octokit()
    const data = await octokit.request('GET /repos/dridk/pandas-ninja/contents/challenges')
    let challenges = data["data"].map((el:ChallengeFile)=>{
      
      return {
        name: el["name"], 
        download_url: el["download_url"]
      }
    })
    return challenges
  }
  
  // function load challenge
  async function open_challenge(url:string){
    console.debug("open challenge")
    console.debug(url)
    let response = await fetch(url);
    response.json().then((el:Challenge)=>{
    
      current_input = el.input;
      current_expected = el.expected
      setCurrentChallenge(el) 

      setCode(`# Change the current \`df\` dataframe\n# to make it as the same as expected\ndf`)
      run_code()
      

  })
  }

  // append stdout 
  function append_stdout(text:string)
  {
    global_stdout = global_stdout + "\n" + text
    console.debug(global_stdout)
    setStdout(global_stdout)
  }


  // function load Python 
  async function load_python(){

    console.debug("Chargement de Python")
    setLoading(true)

    window.pyodide = await window.loadPyodide({
      stdout: (text:string) => append_stdout(text),
      stderr: (text:string)=> setStdErr(text )

    });
    console.log(window.pyodide.runPython(`
        import sys
        sys.version

    `));

    await window.pyodide.loadPackage(["pandas"]);
    console.log(window.pyodide.runPython(`
        import pandas as pd 
    `));
    setLoading(false)

    return true
  }

  // Check victory 
  
  function check_victory(user:any, expected:any){

    if (JSON.stringify(user) == JSON.stringify(expected))
    {
     console.debug("WIN !!!!!!!!!!")
      winDialog.onOpen()

    }

  }
 

   // Run python code
  function run_code(){

    
    setStdErr("")
    setTabIndex(0)

    console.debug(code)

    try {
    
    let input:[] = current_input


    window.pyodide.globals.set("raw_input", input)

       
    const start_code = `import js\ndf = pd.DataFrame(raw_input.to_py())`
    const end_code = `df = df.to_dict(orient="records")`

    const all_code = start_code + "\n" + code + "\n" + end_code

    window.pyodide.runPython(all_code);

    let json_result = window.pyodide.globals.get("df")
    json_result = json_result.toJs({dict_converter : Object.fromEntries})
    
    // console.debug(json_result)
   
    setComputedData(json_result)

    console.debug("=====A")
    console.debug(window.json_result)

    // console.debug("=====B")
    // console.debug(current_expected)

    // console.debug("=====C")
   
    check_victory(json_result, current_expected)

 
   

    }

    catch (err)
    {
      let message = ((err as Error).message);
      console.debug(message)
      setStdErr(message)
      setTabIndex(1)
    }


   }
  
  
  
  
  
  // Keep Dark always
  React.useEffect(() => { localStorage.removeItem("chakra-ui-color-mode"); }, []);
  


  // State variable 
  const  drawerFlag = useDisclosure()
  const [challengeFiles, setChallengeFiles] = React.useState<ChallengeFile[]>([])
  const [currentChallenge, setCurrentChallenge] = React.useState<Challenge>()
  const [loading, setLoading] = React.useState<boolean>(true)

  const [computedData, setComputedData] = React.useState([])

  const [code, setCode] = React.useState<string>("");
  const [stdout, setStdout] = React.useState<string>();
  const [stderr, setStdErr] = React.useState<string>();
  const [tabIndex, setTabIndex] = React.useState<number>(0);

  const winDialog = useDisclosure({defaultIsOpen:false})

  // init application 
  React.useEffect(()=> {
    
    // Chargement de Python 
    load_python().then((e)=>{console.debug("Success")})

    // Load menu 
    load_challenges().then((files)=>setChallengeFiles(files))

    console.debug("salut\nboby")

    
    
  }, [])

  
  
  
  return (
    <ChakraProvider theme={theme} >

    <WinDialog isOpen={winDialog.isOpen} onClose={winDialog.onClose}/>

    <NavBar 
    title={currentChallenge?.name ?? "Not Set"} 
    description={currentChallenge?.description ?? ""}
    onDrawerClicked={drawerFlag.onOpen} 
    loading = {loading} />
    
    <ChallengesDrawer
    isOpen={drawerFlag.isOpen} 
    onClose={drawerFlag.onClose}
    challenges={challengeFiles}
    openChallenge={open_challenge}
    />
    
    
    <Box  height="92vh">
    
    <Allotment>
    <Allotment vertical={true}>
    
    <EditorBox 
    code={code}
    onCodeChanged={setCode}
    onRun={()=>run_code()} 
    
    />
    <LogBox stderr={stderr} stdout={stdout} index={tabIndex} onIndexChanged={setTabIndex}/>
    </Allotment>
    
    <Allotment vertical={true}>
   
    <ViewFrame title="yours" data={computedData}/>
    <ViewFrame title="expected" data={currentChallenge?.expected}/>
    
    {/* <DataFrame title="Input table" data={computedData}/> */}
    {/* <DataFrame title="Expected table"  data={currentChallenge?.expected ?? []}/> */}
    </Allotment>
    
    </Allotment>
    
    </Box>
    </ChakraProvider>
    )
    
  }