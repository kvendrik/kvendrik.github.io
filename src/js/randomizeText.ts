export default function randomizeText(
  node: HTMLElement,
  options = {
    iterations: 10,
    characterDelay: 75,
    timeBetweenIterations: 150,
  },
) {
  const originalText = node.innerText;
  const textLength = originalText.length;
  let newText = '';

  for (let i = 0; i < textLength; i++) {
    const charCode = originalText.charCodeAt(i);
    newText += String.fromCharCode(charCode + 1);
  }

  node.innerText = newText;

  for (let i = 0; i < textLength; i++) {
    setTimeout(
      () =>
        iterateCharacter(
          node,
          originalText,
          i,
          options.iterations,
          options.timeBetweenIterations,
        ),
      i * options.characterDelay,
    );
  }
}

function iterateCharacter(
  node: HTMLElement,
  originalText: string,
  index: number,
  iterations: number,
  timeBetweenIterations: number,
) {
  const originalCharacter = originalText[index];
  const charCode = node.innerText.charCodeAt(index);
  let iteration = 1;

  runNextIteration();

  function runNextIteration() {
    iteration++;

    const nextCharacter = String.fromCharCode(charCode + iteration);
    let newText = node.innerText;

    if (iteration !== iterations) {
      newText = replaceAt(newText, index, nextCharacter);
      setTimeout(runNextIteration, timeBetweenIterations);
    } else {
      newText = replaceAt(newText, index, originalCharacter);
    }

    node.innerText = newText;
  }
}

function replaceAt(string: string, index: number, character: string) {
  return `${string.substr(0, index)}${character}${string.substr(index + 1)}`;
}

randomizeText(document.querySelector('.first') as HTMLElement);
randomizeText(document.querySelector('.last') as HTMLElement);
