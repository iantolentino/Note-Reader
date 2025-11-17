import tkinter as tk
from tkinter import messagebox
import threading

class TimerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Timer App")
        self.root.attributes('-topmost', True)  # Keep the window always on top
        
        self.label = tk.Label(root, text="Enter time in seconds:", font=("Helvetica", 16))
        self.label.pack(pady=10)
        
        self.entry = tk.Entry(root, font=("Helvetica", 16))
        self.entry.pack(pady=10)
        
        self.start_button = tk.Button(root, text="Start Timer", command=self.start_timer, font=("Helvetica", 16))
        self.start_button.pack(pady=5)
        
        self.stop_button = tk.Button(root, text="Stop Timer", command=self.stop_timer, font=("Helvetica", 16))
        self.stop_button.pack(pady=5)
        
        self.time_label = tk.Label(root, text="", font=("Helvetica", 16))
        self.time_label.pack(pady=10)
        
        self.timer_running = False

    def start_timer(self):
        if self.timer_running:
            return  # Do nothing if the timer is already running

        try:
            self.time_left = int(self.entry.get())
            if self.time_left <= 0:
                raise ValueError("Please enter a positive integer")
        except ValueError:
            messagebox.showerror("Invalid Input", "Please enter a valid number of seconds")
            return
        
        self.entry.config(state=tk.DISABLED)
        self.start_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.timer_running = True
        self.update_timer()
        
    def stop_timer(self):
        self.timer_running = False
        self.entry.config(state=tk.NORMAL)
        self.start_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
        self.time_label.config(text="")

    def update_timer(self):
        if self.timer_running and self.time_left > 0:
            mins, secs = divmod(self.time_left, 60)
            time_format = f'{mins:02d}:{secs:02d}'
            self.time_label.config(text=time_format)
            self.time_left -= 1
            self.root.after(1000, self.update_timer)
        elif self.time_left == 0:
            self.time_label.config(text="Time's up!")
            messagebox.showinfo("Timer", "Time's up!")
            self.stop_timer()

if __name__ == "__main__":
    root = tk.Tk()
    app = TimerApp(root)
    root.mainloop()
