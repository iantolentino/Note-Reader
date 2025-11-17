# name = input("Enter your name: ")
# print("Hi, " + name + "!")

# num1 = int(input("Enter your first number: "))
# num2 = int(input("Enter your second number: "))

# print("Your two numbers are: ", num1, "and", num2 )
 
def addNum(num1, num2):
    total = num1 + num2
    return (total)
num1 = int(input("Enter your first number: "))
num2 = int(input("Enter your second number: "))

print("Total: ", addNum(num1, num2))