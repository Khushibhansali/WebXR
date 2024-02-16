import numpy as np
import matplotlib.pyplot as plt
import json

file = r"filename.json"

with open(file, encoding='utf-8') as fh:
    data = json.load(fh)


correct = {}
for row in data:
    if(row["contrast"] != 1):
        if "%.4f" % row["contrast"] not in correct:
            correct["%.4f" % row["contrast"]] = []
        correct["%.4f" % row["contrast"]].append(
            row["contrast"] == 0 and row["response"] == False or row["contrast"] != 0 and row["response"] == True)


fig = plt.figure()

for contrast in sorted(list(correct.keys())):
    plt.errorbar(x=float(contrast),
                 y=np.mean(correct[contrast]),
                 yerr=np.std(correct[contrast]),
                 markersize=10,
                 marker=".")

plt.xlabel("Contrast")
plt.ylabel("Proportion Correct (PC)")

plt.show()