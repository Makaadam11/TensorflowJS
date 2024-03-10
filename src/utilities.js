const labelMap = {
  1:{name:'Hello'},
  2:{name:'Thank You'},
  3:{name:'I Love You'},
  4:{name:'Yes'},
  5:{name:'No'},
}

export const getSignIndex = (boxes, classes, scores, threshold) => {
  let signIndex = -1;

  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i] && classes[i] && scores[i] > threshold) {
      const text = classes[i];
      console.log(labelMap[text]['name']);
      signIndex = text - 1;
      break;
    }
  }

  return signIndex;
};
