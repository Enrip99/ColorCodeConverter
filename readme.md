# ColorCodeConverter

This tool allows you to convert a Rivals of Aether Workshop character's **colors.gml** file into the required **_info.json** file to use with [Readek's Stream Tool](https://github.com/Readek/RoA-Stream-Tool).

Though this is intended to be used in the [demo website](URL PENDING), local use is also possible. Simply run the command `node ColorConverter.js` and it will create *(or overwrite!)* the **_info.json** file on this same directory. By default, the program will use the **colors.gml** file in this directory, but a different file can be provided through the terminal at launch, such as by executing `node ColorConverter.js ../Sandbert/scripts/colors.gml`

In case the provided **colors.gml** has not been properly created *(unassigned colors, assigning colors to non-existing skins...)*, a message on the terminal will notify such errors and cancel the execution. If you believe you have encountered an error, please contact me!

The included **colors.gml** and **_info.json** are provided as examples, belonging to Guadua.
