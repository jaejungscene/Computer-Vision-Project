import os
import torch
from .iresnet import iresnet18

def get_model(base_dir=None):
    if base_dir:
        model = iresnet18()
        return model
    else:
        print("load model weigth..")
        weights = torch.load(os.path.join(base_dir,"weights/baseline-arcface.pth"), map_location=torch.device("cpu"))
        model = iresnet18()
        model.load_state_dict(weights)
        return model